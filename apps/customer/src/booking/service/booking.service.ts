import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';
import { RedisService } from '@app/redis';
import { NotificationsService } from '../../notifications/notifications.service';

const SEAT_LOCK_TTL = 420;

@Injectable()
export class BookingService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
    private readonly wsGateway: RihlaWsGateway,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(createBookingDto: CreateBookingDto, customerId: string) {
    try {
      new Logger('BookingService').log('Creating booking: ' + JSON.stringify(createBookingDto));
      const trip = await this.prisma.trip.findUnique({
        where: { id: createBookingDto.tripId },
      });

      if (!trip) {
        throw new NotFoundException('الرحلة غير موجودة');
      }

      if (
        !Array.isArray(createBookingDto.seatNumbers) ||
        createBookingDto.seatNumbers.length === 0
      ) {
        throw new BadRequestException('يجب اختيار مقعد واحد على الأقل');
      }

      const sanitizedSeats = createBookingDto.seatNumbers.map(Number);

      const existingBooking = await this.prisma.booking.findFirst({
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

      const blockedSeats = await this.getBlockedSeatsFromRedis(createBookingDto.tripId);
      const hasBlocked = sanitizedSeats.some((s) => blockedSeats.includes(s));
      if (hasBlocked) {
        throw new BadRequestException('هذا المقعد محجوز بالفعل');
      }

      const booking = await this.prisma.booking.create({
        data: {
          ...createBookingDto,
          seatNumbers: sanitizedSeats,
          customerId: customerId,
          passenger: createBookingDto.passenger as any,
        },
        include: {
          Trip: true,
          Payment: true,
          TicketPDF: true,
        },
      });

      this.wsGateway.emitToCustomer(customerId, WS_EVENTS.BOOKING_CREATED, {
        bookingId: booking.id,
        status: booking.status,
      });

      const tripPrice = Number(trip.price ?? 0);
      const seatCount = sanitizedSeats.length;
      const baseAmount = tripPrice * seatCount;

      const activeFee = await this.prisma.platformFee.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      const platformFeeAmount = activeFee ? Number(activeFee.amount) : 0;
      const totalAmount = baseAmount + platformFeeAmount;

      return {
        ...(booking as any),
        _pricing: {
          tripPrice,
          seatCount,
          baseAmount,
          platformFeeAmount,
          platformFeeLabel: activeFee?.description || 'رسوم المنصة',
          platformFeeRate: activeFee ? Number(activeFee.amount) : 0,
          totalAmount,
          currency: trip.price ? 'جنيه' : 'جنيه',
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          'بيانات الحجز غير صالحة. يرجى التحقق من المدخلات',
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(
          'حدث خطأ في قاعدة البيانات. يرجى المحاولة مجدداً',
        );
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
      if (!Array.isArray(dto.seatNumbers) || dto.seatNumbers.length === 0) {
        throw new BadRequestException('يجب اختيار مقعد واحد على الأقل');
      }

      const sanitizedSeats = dto.seatNumbers.map(Number);

      const blocked = await this.getBlockedSeatsFromRedis(dto.tripId);
      const hasBlocked = sanitizedSeats.some((s) => blocked.includes(s));
      if (hasBlocked) {
        throw new BadRequestException('هذا المقعد محجوز بالفعل');
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const trip = await tx.trip.findUnique({
          where: { id: dto.tripId },
        });

        if (!trip) {
          throw new NotFoundException('الرحلة غير موجودة');
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

        const booking = await tx.booking.create({
          data: {
            tripId: dto.tripId,
            customerId,
            seatNumbers: sanitizedSeats,
            passenger: dto.passenger as any,
            passengerContact: dto.passengerContact,
            status: BookingStatus.PENDING,
          },
        });

        const activeFee = await this.prisma.platformFee.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });

        const platformFeeAmount = activeFee ? Number(activeFee.amount) : 0;

        const payment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId,
            price: dto.price ?? tripPrice,
            totalAmount: dto.totalAmount,
            companyAmount: dto.companyAmount,
            commissionAmount: dto.commissionAmount,
            platformFeeAmount: dto.platformFeeAmount ?? platformFeeAmount,
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
            platformFeeAmount,
            totalAmount: dto.totalAmount,
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
        });
      }

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
        throw new BadRequestException(
          'حدث خطأ في قاعدة البيانات. يرجى المحاولة مجدداً',
        );
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
      },
    });

    const bookedSeats = bookings.flatMap((booking: any) => booking.seatNumbers);

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
          } catch {}
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
    const expiresAt = Date.now() + SEAT_LOCK_TTL * 1000;
    const key = `booking-session:${customerId}:${tripId}`;
    const existing = await this.redis.get(key);
    let data: any = {};
    if (existing) {
      try {
        data = JSON.parse(existing);
      } catch {}
    }
    data.seats = seats;
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

  async clearSeatLocksOnBooking(customerId: string, tripId: string): Promise<void> {
    await this.unlockSeats(customerId, tripId);
  }

  async getBookings() {
    return this.prisma.booking.findMany({
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getBookingsByProperties(
    property1: string,
    value1: string,
    property2: string,
    value2: string,
  ) {
    return this.prisma.booking.findMany({
      where: {
        AND: [{ [property1]: value1 }, { [property2]: value2 }],
      },
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getBookingsByProperty(property: string, value: string) {
    const whereClause: any = {};
    whereClause[property] = value;

    return this.prisma.booking.findMany({
      where: whereClause,
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getBooking(property: string, value: string) {
    const whereClause: any = {};
    whereClause[property] = value;

    const booking = await this.prisma.booking.findFirst({
      where: whereClause,
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: true,
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
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        AND: [{ [property1]: value1 }, { [property2]: value2 }],
      },
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    // Check if booking exists
    const existingBooking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    // If updating seatNumbers, check if new seat is already booked for this trip
    if (updateBookingDto.seatNumbers && updateBookingDto.tripId) {
      const conflictingBooking = await this.prisma.booking.findFirst({
        where: {
          id: { not: id },
          tripId: updateBookingDto.tripId,
          seatNumbers: {
            hasSome: updateBookingDto.seatNumbers, // ✅ Check for overlapping seats
          },
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
          },
        },
      });

      if (conflictingBooking) {
        throw new BadRequestException('المقعد محجوز بالفعل');
      }
    }

    const updateData: {
      passenger?: any;
      customerId?: string;
      tripId?: string;
      seatNumbers?: number[];
      passengerContact?: string;
      status?: BookingStatus;
    } = {};

    if (updateBookingDto.passenger !== undefined)
      updateData.passenger = updateBookingDto.passenger;
    if (updateBookingDto.customerId !== undefined)
      updateData.customerId = updateBookingDto.customerId;
    if (updateBookingDto.tripId !== undefined)
      updateData.tripId = updateBookingDto.tripId;
    if (updateBookingDto.seatNumbers !== undefined)
      updateData.seatNumbers = updateBookingDto.seatNumbers;
    if (updateBookingDto.passengerContact !== undefined)
      updateData.passengerContact = updateBookingDto.passengerContact;
    if (updateBookingDto.status !== undefined)
      updateData.status = updateBookingDto.status;

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

  async delete(id: string) {
    const existingBooking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    await this.prisma.booking.delete({
      where: { id },
    });

    this.wsGateway.emitToCustomer(existingBooking.customerId, WS_EVENTS.BOOKING_CANCELLED, {
      bookingId: id,
      status: 'CANCELLED',
    });
    this.wsGateway.emitSeatUpdate(existingBooking.tripId, {
      seatNumbers: existingBooking.seatNumbers,
      action: 'released',
      bookingId: id,
    });

    return { message: 'تم حذف الحجز بنجاح' };
  }
}
