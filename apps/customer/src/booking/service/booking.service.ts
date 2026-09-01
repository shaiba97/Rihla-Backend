import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@app/prisma';
import { PaymentService } from './payment.service';
import { PrismaService } from '@app/prisma';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CreateBookingWithPaymentDto,
} from '../dto/booking.dto';
import { BookingStatus, PaymentStatus } from '@app/prisma';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
import { RedisService } from '@app/redis';
import { NotificationsService } from '../../notifications/notifications.service';

const SEAT_LOCK_TTL = 420;

/** Hard cap on seats per booking/lock request — prevents abuse of the
 *  seat-holding mechanism even before bus capacity is known. */
const MAX_SEATS_PER_REQUEST = 20;

/** Properties a customer may filter bookings/payments by. */
const FILTERABLE_PROPERTIES = ['id', 'customerId', 'tripId', 'status'] as const;

function sanitizeSeats(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException('يجب اختيار مقعد واحد على الأقل');
  }
  const seats = [
    ...new Set(
      raw.map((s) => Number(s)).filter((n) => Number.isInteger(n) && n >= 1),
    ),
  ];
  if (seats.length === 0) {
    throw new BadRequestException('يجب اختيار مقعد واحد على الأقل');
  }
  if (seats.length > MAX_SEATS_PER_REQUEST) {
    throw new BadRequestException(
      `لا يمكن حجز أكثر من ${MAX_SEATS_PER_REQUEST} مقاعد في الحجز الواحد`,
    );
  }
  return seats;
}

function assertFilterableProperties(properties: string[]): void {
  for (const p of properties) {
    if (!(FILTERABLE_PROPERTIES as readonly string[]).includes(p)) {
      throw new ForbiddenException('خاصية البحث غير مسموح بها');
    }
  }
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
    private readonly wsGateway: TafiyaWsGateway,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Serializes all booking creation per trip so two concurrent requests can
   * never pass the availability check simultaneously (double-booking race).
   */
  private async lockTrip(
    tx: {
      $queryRaw: (
        query: TemplateStringsArray,
        ...values: any[]
      ) => Promise<any>;
    },
    tripId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tripId}))::text`;
  }

  async create(createBookingDto: CreateBookingDto, customerId: string) {
    try {
      const sanitizedSeats = sanitizeSeats(createBookingDto.seatNumbers);

      const result = await this.prisma.$transaction(async (tx: any) => {
        await this.lockTrip(tx, createBookingDto.tripId);

        const trip = await tx.trip.findUnique({
          where: { id: createBookingDto.tripId },
          include: { Bus: true },
        });

        if (!trip) {
          throw new NotFoundException('الرحلة غير موجودة');
        }

        if (
          trip.Bus &&
          Number.isFinite(trip.Bus.chairs) &&
          sanitizedSeats.some((s) => s > trip.Bus.chairs)
        ) {
          throw new BadRequestException('رقم المقعد غير صالح لهذه الحافلة');
        }

        const existingBooking = await tx.booking.findFirst({
          where: {
            tripId: createBookingDto.tripId,
            seatNumbers: {
              hasSome: sanitizedSeats,
            },
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
        });

        if (existingBooking) {
          throw new BadRequestException('هذا المقعد محجوز بالفعل');
        }

        const blockedSeats = await this.getBlockedSeatsFromRedis(
          createBookingDto.tripId,
        );
        const hasBlocked = sanitizedSeats.some((s) => blockedSeats.includes(s));
        if (hasBlocked) {
          throw new BadRequestException('هذا المقعد محجوز بالفعل');
        }

        const passengerData = (createBookingDto.passenger ?? [])
          .filter(
            (p: any) =>
              p && p.name && p.name !== '' && p.age != null && p.gender,
          )
          .map((p: any) => ({
            name: String(p.name),
            age: Number(p.age),
            gender: String(p.gender),
          }));

        // Status is always PENDING on creation — confirmation happens only
        // after payment verification by an administrator.
        const booking = await tx.booking.create({
          data: {
            tripId: createBookingDto.tripId,
            seatNumbers: sanitizedSeats,
            customerId: customerId,
            passenger: passengerData as any,
            passengerContact: createBookingDto.passengerContact,
            status: BookingStatus.PENDING,
          },
          include: {
            Trip: true,
            Payment: true,
            TicketPDF: true,
          },
        });

        const tripPrice = Number(trip.price ?? 0);
        const seatCount = sanitizedSeats.length;
        const baseAmount = tripPrice * seatCount;

        const activeFee = await tx.platformFee.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });

        const platformFeeRate = activeFee ? Number(activeFee.percentage) : 0;
        const platformFeeAmount =
          Math.round(baseAmount * platformFeeRate) / 100;
        const totalAmount = baseAmount;

        return {
          booking,
          _pricing: {
            tripPrice,
            seatCount,
            baseAmount,
            platformFeeAmount,
            platformFeeLabel: activeFee?.label || 'رسوم المنصة',
            platformFeeRate,
            totalAmount,
            currency: 'جنيه',
          },
        };
      });

      this.wsGateway.emitToCustomer(customerId, WS_EVENTS.BOOKING_CREATED, {
        bookingId: result.booking.id,
        status: result.booking.status,
      });

      return {
        ...result.booking,
        _pricing: result._pricing,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          'بيانات الحجز غير صالحة. يرجى التحقق من المدخلات',
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            throw new BadRequestException(
              'رقم العملية مكرر — يرجى استخدام رقم عملية فريد أو المحاولة بدون رقم',
            );
          case 'P2003':
            throw new BadRequestException(
              'خطأ في البيانات المرجعية — يرجى المحاولة مجدداً',
            );
          default:
            this.logger.error(
              `booking.create Prisma error: code=${error.code} meta=${JSON.stringify(error.meta)} message=${error.message}`,
            );
            throw new BadRequestException(
              'حدث خطأ في قاعدة البيانات. يرجى المحاولة مجدداً',
            );
        }
      }
      throw error;
    }
  }

  async createBookingWithPayment(
    dto: CreateBookingWithPaymentDto,
    customerId: string,
    receiptFile?: string,
  ) {
    try {
      if (typeof dto.seatNumbers === 'string') {
        try {
          dto.seatNumbers = JSON.parse(dto.seatNumbers);
        } catch {
          dto.seatNumbers = [];
        }
      }
      if (typeof dto.passenger === 'string') {
        try {
          dto.passenger = JSON.parse(dto.passenger);
        } catch {
          dto.passenger = [];
        }
      }

      const sanitizedSeats = sanitizeSeats(dto.seatNumbers);

      const blocked = await this.getBlockedSeatsFromRedis(dto.tripId);
      const hasBlocked = sanitizedSeats.some((s) => blocked.includes(s));
      if (hasBlocked) {
        throw new BadRequestException('هذا المقعد محجوز بالفعل');
      }

      const result = await this.prisma.$transaction(async (tx: any) => {
        await this.lockTrip(tx, dto.tripId);

        const trip = await tx.trip.findUnique({
          where: { id: dto.tripId },
          include: { Bus: true },
        });

        if (!trip) {
          throw new NotFoundException('الرحلة غير موجودة');
        }

        if (
          trip.Bus &&
          Number.isFinite(trip.Bus.chairs) &&
          sanitizedSeats.some((s) => s > trip.Bus.chairs)
        ) {
          throw new BadRequestException('رقم المقعد غير صالح لهذه الحافلة');
        }

        const existingBooking = await tx.booking.findFirst({
          where: {
            tripId: dto.tripId,
            seatNumbers: { hasSome: sanitizedSeats },
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          },
        });

        if (existingBooking) {
          throw new BadRequestException('هذا المقعد محجوز بالفعل');
        }

        const tripPrice = Number(trip.price ?? 0);
        const seatCount = sanitizedSeats.length;
        const baseAmount = tripPrice * seatCount;

        const passengerData = (dto.passenger ?? [])
          .filter(
            (p: any) =>
              p && p.name && p.name !== '' && p.age != null && p.gender,
          )
          .map((p: any) => ({
            name: String(p.name),
            age: Number(p.age),
            gender: String(p.gender),
          }));

        const booking = await tx.booking.create({
          data: {
            tripId: dto.tripId,
            customerId,
            seatNumbers: sanitizedSeats,
            passenger: passengerData as any,
            passengerContact: dto.passengerContact,
            status: BookingStatus.PENDING,
          },
        });

        const activeFee = await tx.platformFee.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });

        const platformFeeRate = activeFee ? Number(activeFee.percentage) : 0;
        const platformFeeAmount =
          Math.round(baseAmount * platformFeeRate) / 100;
        const serverCompanyAmount = baseAmount - platformFeeAmount;
        const serverTotalAmount = baseAmount;

        // All financial figures are derived server-side. Client-sent amounts
        // are ignored; commission mirrors the platform fee so that
        // companyAmount == totalAmount - commissionAmount always holds.

        const payment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId,
            price: tripPrice,
            totalAmount: serverTotalAmount,
            companyAmount: serverCompanyAmount,
            commissionAmount: platformFeeAmount,
            platformFeeAmount,
            currency: dto.currency || 'SDG',
            status: PaymentStatus.PENDING,
            paymentMethod: dto.paymentMethod,
            transactionId: dto.transactionId,
            receiptFile: receiptFile ?? null,
          },
          include: {
            Booking: {
              include: {
                Trip: { include: { Bus: true } },
              },
            },
          },
        });

        return {
          booking,
          payment,
          _pricing: {
            tripPrice,
            seatCount,
            baseAmount,
            platformFeeRate,
            platformFeeAmount,
            totalAmount: serverTotalAmount,
          },
        };
      });

      const companyId = result.payment.Booking?.Trip?.Bus?.companyId;

      this.wsGateway.emitToCustomer(customerId, WS_EVENTS.BOOKING_CREATED, {
        bookingId: result.booking.id,
        status: result.booking.status,
      });

      if (companyId) {
        this.wsGateway.emitToCompany(companyId, WS_EVENTS.BOOKING_CREATED, {
          bookingId: result.booking.id,
          tripId: dto.tripId,
          status: result.booking.status,
          seatNumbers: sanitizedSeats,
        });
      }

      this.wsGateway.emitSeatUpdate(dto.tripId, {
        seatNumbers: sanitizedSeats,
        action: 'held',
        bookingId: result.booking.id,
      });

      const admins = await this.prisma.users.findMany({
        where: { role: 'ADMIN' as any },
        select: { id: true },
      });

      for (const admin of admins) {
        await this.notifications.create({
          userId: admin.id,
          type: 'BOOKING_CREATED',
          title: 'حجز جديد يحتاج تأكيدك',
          body: `قام عميل بحجز مقعد رقم ${sanitizedSeats.join('، ')} في رحلة`,
          data: {
            bookingId: result.booking.id,
            seatNumber: sanitizedSeats,
            tripId: dto.tripId,
            customerId,
            route: '/financial',
          },
          emitTo: 'admin',
          sendPush: true,
        });
      }

      await this.notifications.create({
        userId: customerId,
        type: 'BOOKING_CREATED',
        title: 'تم إنشاء حجزك',
        body: `تم حجز مقعد رقم ${sanitizedSeats.join('، ')} بنجاح. في انتظار تأكيد الدفع`,
        data: {
          bookingId: result.booking.id,
          seatNumber: sanitizedSeats,
          tripId: dto.tripId,
          route: '/bookings',
        },
        sendPush: true,
      });

      const ticket = await this.paymentService.generateTicket(
        result.booking,
        result.payment,
      );

      await this.clearSeatLocksOnBooking(customerId, dto.tripId);

      return {
        message: 'تم إنشاء الحجز والدفعة بنجاح',
        ...result,
        ticket,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          'بيانات الحجز غير صالحة. يرجى التحقق من المدخلات',
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            throw new BadRequestException(
              'رقم العملية مكرر — يرجى استخدام رقم عملية فريد أو المحاولة بدون رقم',
            );
          case 'P2003':
            throw new BadRequestException(
              'خطأ في البيانات المرجعية — يرجى المحاولة مجدداً',
            );
          default:
            this.logger.error(
              `createBookingWithPayment Prisma error: code=${error.code} meta=${JSON.stringify(error.meta)} message=${error.message}`,
            );
            throw new BadRequestException(
              'حدث خطأ في قاعدة البيانات. يرجى المحاولة مجدداً',
            );
        }
      }
      throw error;
    }
  }

  async getBookedSeats(tripId: string): Promise<number[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        tripId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
      },
      select: {
        seatNumbers: true,
        status: true,
        Payment: { select: { id: true } },
      },
    });

    const activeBookings = bookings.filter(
      (b: any) => b.status === BookingStatus.CONFIRMED || b.Payment,
    );
    const bookedSeats = activeBookings.flatMap(
      (booking: any) => booking.seatNumbers,
    );

    const heldSeats = await this.getHeldSeatsFromRedis(tripId);

    const blockedSeats = await this.getBlockedSeatsFromRedis(tripId);

    return [...new Set([...bookedSeats, ...heldSeats, ...blockedSeats])];
  }

  private async getBlockedSeatsFromRedis(tripId: string): Promise<number[]> {
    try {
      const raw = await this.redis.get(`blocked-seats:${tripId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async getHeldSeatsFromRedis(tripId: string): Promise<number[]> {
    try {
      const keys = await this.redis.keys(`booking-session:*:${tripId}`);
      if (keys.length === 0) return [];
      const values = await Promise.all(keys.map((k) => this.redis.get(k)));
      const seats: number[] = [];
      for (const v of values) {
        if (v) {
          try {
            const data = JSON.parse(v);
            if (Array.isArray(data.seats)) {
              seats.push(...data.seats);
            }
          } catch {
            // Skip malformed session entries.
          }
        }
      }
      return [...new Set(seats)];
    } catch {
      return [];
    }
  }

  async lockSeats(
    customerId: string,
    tripId: string,
    seats: number[],
  ): Promise<{ expiresAt: number }> {
    const sanitized = sanitizeSeats(seats);
    const expiresAt = Date.now() + SEAT_LOCK_TTL * 1000;
    const key = `booking-session:${customerId}:${tripId}`;
    const existing = await this.redis.get(key);
    let data: any = {};
    if (existing) {
      try {
        data = JSON.parse(existing);
      } catch {
        // Corrupted session entry — start from a fresh session object.
      }
    }
    data.seats = sanitized;
    data.expiresAt = expiresAt;
    await this.redis.setex(key, SEAT_LOCK_TTL, JSON.stringify(data));
    return { expiresAt };
  }

  async unlockSeats(customerId: string, tripId: string): Promise<void> {
    const key = `booking-session:${customerId}:${tripId}`;
    await this.redis.del(key);
  }

  async updateSessionStep(
    customerId: string,
    tripId: string,
    step: 'seat' | 'passenger' | 'payment',
  ): Promise<{ expiresAt: number }> {
    const key = `booking-session:${customerId}:${tripId}`;
    const existing = await this.redis.get(key);
    if (!existing) {
      return { expiresAt: 0 };
    }
    const data = JSON.parse(existing);
    data.step = step;
    const expiresAt = Date.now() + SEAT_LOCK_TTL * 1000;
    data.expiresAt = expiresAt;
    await this.redis.setex(key, SEAT_LOCK_TTL, JSON.stringify(data));
    return { expiresAt };
  }

  async getSessionState(
    customerId: string,
    tripId: string,
  ): Promise<{
    seats: number[];
    step: string;
    expiresAt: number;
  } | null> {
    const key = `booking-session:${customerId}:${tripId}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return {
        seats: data.seats ?? [],
        step: data.step ?? 'seat',
        expiresAt: data.expiresAt ?? 0,
      };
    } catch {
      return null;
    }
  }

  async clearSeatLocksOnBooking(
    customerId: string,
    tripId: string,
  ): Promise<void> {
    await this.unlockSeats(customerId, tripId);
  }

  /** Only the requesting customer's bookings are returned. */
  async getBookings(customerId: string) {
    return this.prisma.booking.findMany({
      where: { customerId },
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: { select: { id: true, bookingId: true, ticketUrl: true, generatedAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Filterable properties are allowlisted and results are always scoped to
   *  the requesting customer, whatever values were supplied. */
  async getBookingsByProperties(
    property1: string,
    value1: string,
    property2: string,
    value2: string,
    customerId: string,
  ) {
    assertFilterableProperties([property1, property2]);
    return this.prisma.booking.findMany({
      where: {
        customerId,
        AND: [{ [property1]: value1 }, { [property2]: value2 }],
      },
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: { select: { id: true, bookingId: true, ticketUrl: true, generatedAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getBookingsByProperty(
    property: string,
    value: string,
    customerId: string,
  ) {
    assertFilterableProperties([property]);
    const whereClause: any = { customerId };
    whereClause[property] = value;

    return this.prisma.booking.findMany({
      where: whereClause,
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: { select: { id: true, bookingId: true, ticketUrl: true, generatedAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getBooking(property: string, value: string, customerId: string) {
    assertFilterableProperties([property]);
    const whereClause: any = { customerId };
    whereClause[property] = value;

    const booking = await this.prisma.booking.findFirst({
      where: whereClause,
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: { select: { id: true, bookingId: true, ticketUrl: true, generatedAt: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    return booking;
  }

  async getBookingByProperties(
    property1: string,
    value1: string,
    property2: string,
    value2: string,
    customerId: string,
  ) {
    assertFilterableProperties([property1, property2]);
    const booking = await this.prisma.booking.findFirst({
      where: {
        customerId,
        AND: [{ [property1]: value1 }, { [property2]: value2 }],
      },
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: { select: { id: true, bookingId: true, ticketUrl: true, generatedAt: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    return booking;
  }

  /** Customers may only edit their own bookings and only passenger data —
   *  ownership, trip, seats and status are not writable here. */
  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    customerId: string,
  ) {
    const existingBooking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    if (existingBooking.customerId !== customerId) {
      throw new ForbiddenException('لا يمكنك تعديل حجز مستخدم آخر');
    }

    const updateData: {
      passenger?: any;
      passengerContact?: string;
    } = {};

    if (updateBookingDto.passenger !== undefined)
      updateData.passenger = updateBookingDto.passenger;
    if (updateBookingDto.passengerContact !== undefined)
      updateData.passengerContact = updateBookingDto.passengerContact;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('لا توجد بيانات قابلة للتعديل');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: true,
      },
    });

    return updatedBooking;
  }

  async getActivePlatformFee() {
    return this.prisma.platformFee.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActivePaymentAccounts() {
    return this.prisma.paymentAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSupportContacts() {
    return this.prisma.supportContact.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Owners may delete their own bookings (releases seats); other users'
   *  bookings are protected. */
  async delete(id: string, customerId: string) {
    const existingBooking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    if (existingBooking.customerId !== customerId) {
      throw new ForbiddenException('لا يمكنك حذف حجز مستخدم آخر');
    }

    await this.prisma.booking.delete({
      where: { id },
    });

    this.wsGateway.emitToCustomer(
      existingBooking.customerId,
      WS_EVENTS.BOOKING_CANCELLED,
      {
        bookingId: id,
        status: 'CANCELLED',
      },
    );
    this.wsGateway.emitSeatUpdate(existingBooking.tripId, {
      seatNumbers: existingBooking.seatNumbers,
      action: 'released',
      bookingId: id,
    });

    return { message: 'تم حذف الحجز بنجاح' };
  }
}
