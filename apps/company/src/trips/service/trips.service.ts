import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService, Prisma } from '@app/prisma';
import { RedisService } from '@app/redis';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
import { PDFService } from '@app/pdf';
import { CreateTripDto, UpdateTripDto } from '../dto/trips.dto';

export interface Actor {
  id: string;
  role: string;
}

/** Properties the PUBLIC trip lookups may filter by. */
const PUBLIC_TRIP_PROPERTIES = ['id', 'busId'] as const;

function assertPublicProperty(property: string): void {
  if (!(PUBLIC_TRIP_PROPERTIES as readonly string[]).includes(property)) {
    throw new ForbiddenException('خاصية البحث غير مسموح بها');
  }
}

/** Hard sanity cap before per-bus capacity is checked. */
const MAX_SEATS_PER_REQUEST = 100;

function sanitizeSeats(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) {
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
    throw new BadRequestException('عدد المقاعد كبير جدًا');
  }
  return seats;
}

/** Escapes HTML-special characters before interpolation into templates. */
function esc(value: unknown): string {
  const raw =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: TafiyaWsGateway,
    private readonly pdfService: PDFService,
    private readonly redisService: RedisService,
  ) {}

  /** Companies may only touch their own trips; admins bypass the check. */
  private assertOwnership(
    trip: { Bus?: { companyId?: string } | null },
    actor: Actor,
  ): void {
    if (actor.role === 'ADMIN') return;
    if (!trip.Bus || trip.Bus.companyId !== actor.id) {
      throw new ForbiddenException('لا تملك صلاحية على هذه الرحلة');
    }
  }

  async create(createTripDto: CreateTripDto, actor: Actor) {
    if (!createTripDto || !createTripDto.busId) {
      throw new BadRequestException(
        'بيانات الرحلة غير صالحة - busId field is missing',
      );
    }

    const bus = await this.prisma.bus.findUnique({
      where: { id: createTripDto.busId },
    });

    if (!bus) {
      throw new NotFoundException('الحافلة غير موجودة');
    }

    if (actor.role !== 'ADMIN' && bus.companyId !== actor.id) {
      throw new ForbiddenException('لا يمكنك إنشاء رحلة لحافلة شركة أخرى');
    }

    let trip;
    try {
      trip = await this.prisma.trip.create({
        data: {
          busId: createTripDto.busId,
          departureDate: createTripDto.departureDate,
          departureTime: createTripDto.departureTime,
          presence_time: 'قبل ساعة',
          fromState: createTripDto.fromState,
          fromCity: createTripDto.fromCity,
          fromStation: createTripDto.fromStation,
          arrivalTime: createTripDto.arrivalTime,
          arrivalDate: createTripDto.arrivalDate,
          toState: createTripDto.toState,
          toCity: createTripDto.toCity,
          toStation: createTripDto.toStation,
          status: (createTripDto.status as any) || 'SCHEDULED',
          price: createTripDto.price,
        },
      });
    } catch (error) {
      // Client-shaped data problems become clear Arabic 400s instead of raw
      // 500 "Internal server error" (e.g. malformed date strings).
      if (
        error instanceof Prisma.PrismaClientValidationError ||
        error instanceof Prisma.PrismaClientKnownRequestError
      ) {
        throw new BadRequestException(
          'بيانات الرحلة غير صالحة. يرجى التحقق من التواريخ والمدخلات',
        );
      }
      throw error;
    }

    if (bus) {
      this.wsGateway.emitToRoom(
        'company:' + bus.companyId,
        WS_EVENTS.TRIP_CREATED,
        trip,
      );
    }
    this.wsGateway.emitToAdmin(WS_EVENTS.TRIP_CREATED, trip);
    this.wsGateway.emitPublic(WS_EVENTS.TRIP_CREATED, trip);

    return {
      success: true,
      message: 'تم إنشاء الرحلة بنجاح',
      data: trip,
    };
  }

  /** Companies see only their own trips; admins see everything. */
  async getTrips(actor: Actor, status?: string) {
    const where: any =
      actor.role === 'ADMIN' ? {} : { Bus: { companyId: actor.id } };
    if (status) where.status = status;
    return this.prisma.trip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        Bus: true,
        Booking: {
          include: { TicketPDF: true },
        },
      },
    });
  }

  async getAvailableTrips() {
    const now = new Date();

    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'SCHEDULED',
        departureDate: { gte: now },
      },
      include: {
        Bus: { select: { id: true, chairs: true } },
        Booking: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] as any } },
          select: { seatNumbers: true },
        },
      },
    });

    return trips.filter((t: any) => {
      const totalSeats = t.Bus?.chairs ?? 0;
      const bookedSeats = t.Booking.reduce(
        (sum: number, b: any) => sum + (b.seatNumbers?.length ?? 0),
        0,
      );
      return bookedSeats < totalSeats;
    });
  }

  /**
   * Public lookup used by the customer app — restricted properties and
   * sanitized payload (no passenger PII, no ticket records).
   */
  async getPublicTripsByProperty(
    property: string,
    value: string,
    status?: string,
  ) {
    assertPublicProperty(property);
    const where: any = { [property]: value };
    if (status) where.status = status;
    return this.prisma.trip.findMany({
      where,
      include: {
        Bus: {
          select: {
            id: true,
            name: true,
            chairs: true,
            seatStartFrom: true,
            plate: true,
          },
        },
        Booking: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] as any } },
          select: { seatNumbers: true, status: true },
        },
      },
    });
  }

  /** Public single-trip lookup — same sanitization rules. */
  async getPublicTrip(property: string, value: string) {
    assertPublicProperty(property);
    const trip = await this.prisma.trip.findFirst({
      where: { [property]: value },
      include: {
        Bus: {
          select: {
            id: true,
            name: true,
            chairs: true,
            seatStartFrom: true,
            plate: true,
          },
        },
        Booking: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] as any } },
          select: { seatNumbers: true, status: true },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('الرحلة غير موجودة');
    }

    return trip;
  }

  async searchTrips(searchCriteria: {
    fromCity?: string;
    toCity?: string;
    departureDate?: string | Date;
  }) {
    const where: any = { status: 'SCHEDULED' };

    if (searchCriteria.fromCity) {
      where.fromCity = searchCriteria.fromCity;
    }

    if (searchCriteria.toCity) {
      where.toCity = searchCriteria.toCity;
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    where.departureDate = { gte: todayStart };

    if (searchCriteria.departureDate) {
      const parsedDate = new Date(searchCriteria.departureDate);
      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(parsedDate);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        where.departureDate = { gte: parsedDate, lt: dayEnd };
      }
    }

    const trips = await this.prisma.trip.findMany({
      where,
      include: {
        Bus: true,
        Booking: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] as any } },
          select: { seatNumbers: true },
        },
      },
      orderBy: [{ departureDate: 'asc' }],
    });

    const availableTrips = trips.filter((t: any) => {
      const totalSeats = t.Bus?.chairs ?? 0;
      const bookedSeats = t.Booking.reduce(
        (sum: number, b: any) => sum + (b.seatNumbers?.length ?? 0),
        0,
      );
      return bookedSeats < totalSeats;
    });

    return {
      success: true,
      message: `تم العثور على ${availableTrips.length} رحلة`,
      data: availableTrips,
      count: availableTrips.length,
    };
  }

  async update(id: string, updateTripDto: UpdateTripDto, actor: Actor) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { Bus: { select: { id: true, companyId: true } } },
    });

    if (!trip) {
      throw new NotFoundException('الرحلة غير موجودة');
    }

    this.assertOwnership(trip, actor);

    if (updateTripDto.busId && updateTripDto.busId !== trip.busId) {
      const bus = await this.prisma.bus.findUnique({
        where: { id: updateTripDto.busId },
      });

      if (!bus) {
        throw new NotFoundException('الحافلة غير موجودة');
      }

      if (actor.role !== 'ADMIN' && bus.companyId !== actor.id) {
        throw new ForbiddenException('لا يمكنك نقل الرحلة إلى حافلة شركة أخرى');
      }
    }

    const updateData: any = {};

    if (updateTripDto.busId !== undefined)
      updateData.busId = updateTripDto.busId;
    if (updateTripDto.presenceTime !== undefined)
      updateData.presence_time = updateTripDto.presenceTime;
    if (updateTripDto.departureDate !== undefined)
      updateData.departureDate = new Date(updateTripDto.departureDate);
    // Times are "HH:mm" strings — store them verbatim (parsing them as Dates
    // corrupted the column and broke payout eligibility calculations).
    if (updateTripDto.departureTime !== undefined)
      updateData.departureTime = updateTripDto.departureTime;
    if (updateTripDto.fromState !== undefined)
      updateData.fromState = updateTripDto.fromState;
    if (updateTripDto.fromCity !== undefined)
      updateData.fromCity = updateTripDto.fromCity;
    if (updateTripDto.fromStation !== undefined)
      updateData.fromStation = updateTripDto.fromStation;
    if (updateTripDto.arrivalTime !== undefined)
      updateData.arrivalTime = updateTripDto.arrivalTime;
    if (updateTripDto.arrivalDate !== undefined)
      updateData.arrivalDate = new Date(updateTripDto.arrivalDate);
    if (updateTripDto.toState !== undefined)
      updateData.toState = updateTripDto.toState;
    if (updateTripDto.toCity !== undefined)
      updateData.toCity = updateTripDto.toCity;
    if (updateTripDto.toStation !== undefined)
      updateData.toStation = updateTripDto.toStation;
    if (updateTripDto.status !== undefined)
      updateData.status = updateTripDto.status;

    let updatedTrip;
    try {
      updatedTrip = await this.prisma.trip.update({
        where: { id },
        data: updateData,
        include: {
          Bus: true,
          Booking: { include: { TicketPDF: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          'بيانات الرحلة غير صالحة. يرجى التحقق من المدخلات',
        );
      }
      throw error;
    }

    const bus = updatedTrip.Bus;
    if (bus) {
      this.wsGateway.emitToRoom(
        'company:' + bus.companyId,
        WS_EVENTS.TRIP_UPDATED,
        updatedTrip,
      );
    }
    this.wsGateway.emitToAdmin(WS_EVENTS.TRIP_UPDATED, updatedTrip);
    this.wsGateway.emitPublic(WS_EVENTS.TRIP_UPDATED, updatedTrip);

    return {
      success: true,
      message: 'trip updated successfully',
      data: updatedTrip,
    };
  }

  async remove(id: string, actor: Actor) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { Bus: true },
    });

    if (!trip) {
      throw new NotFoundException('trip not found');
    }

    this.assertOwnership(trip, actor);

    const bus = (trip as any).Bus;
    await this.prisma.trip.delete({ where: { id } });

    if (bus) {
      this.wsGateway.emitToRoom(
        'company:' + bus.companyId,
        WS_EVENTS.TRIP_DELETED,
        { id },
      );
    }
    this.wsGateway.emitToAdmin(WS_EVENTS.TRIP_DELETED, { id });
    this.wsGateway.emitPublic(WS_EVENTS.TRIP_DELETED, { id });

    return {
      success: true,
      message: 'trip deleted successfully',
    };
  }

  private async getOwnedTrip(tripId: string, actor: Actor) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { Bus: { select: { id: true, companyId: true } } },
    });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة');
    this.assertOwnership(trip, actor);
    return trip;
  }

  async getPassengerListData(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        Bus: {
          select: { name: true, chairs: true, plate: true, companyId: true },
        },
      },
    });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة');

    const bookings = await this.prisma.booking.findMany({
      where: { tripId, status: 'CONFIRMED' as any },
      orderBy: { createdAt: 'asc' },
    });

    return { trip, bookings };
  }

  /** Authenticated HTML passenger list (header or ?token= auth upstream). */
  async passengerListHtml(tripId: string, actor: Actor): Promise<string> {
    const { trip, bookings } = await this.getPassengerListData(tripId);
    this.assertOwnership(trip, actor);
    return this.renderPassengerListHtml(trip, bookings);
  }

  renderPassengerListHtml(trip: any, bookings: any[]): string {
    const rows = bookings
      .map((b, i) => {
        const passengers = Array.isArray(b.passenger) ? b.passenger : [];
        return passengers
          .map(
            (p: any, pi: number) => `
            <tr>
              <td>${i + 1}${passengers.length > 1 ? `.${pi + 1}` : ''}</td>
              <td>${esc(p.name) || '—'}</td>
              <td>${p.gender === 'MALE' ? 'ذكر' : p.gender === 'FEMALE' ? 'أنثى' : esc(p.gender) || '—'}</td>
              <td>${esc(p.age) || '—'}</td>
              <td>${esc(b.seatNumbers?.join('، ')) || '—'}</td>
            </tr>`,
          )
          .join('');
      })
      .join('');

    const totalPassengers = bookings.reduce(
      (sum: number, b: any) =>
        sum + (Array.isArray(b.passenger) ? b.passenger.length : 0),
      0,
    );

    const plate = trip.Bus?.plate
      ? typeof trip.Bus.plate === 'object'
        ? esc(trip.Bus.plate.arabic) || esc(JSON.stringify(trip.Bus.plate))
        : esc(trip.Bus.plate)
      : '—';

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>كشف الركاب - ${esc(trip.fromCity)} → ${esc(trip.toCity)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; color: #0f172a; padding: 24px; }
    .card { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
    .header { background: #4f46e5; color: #fff; padding: 24px; }
    .header h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
    .header .sub { font-size: 13px; opacity: .85; }
    .body { padding: 24px; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .info-item { display: flex; flex-direction: column; gap: 2px; }
    .info-item .label { font-size: 11px; color: #64748b; font-weight: 600; }
    .info-item .value { font-size: 14px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; text-align: right; padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    tr:hover td { background: #f8fafc; }
    .footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #eef2ff; color: #4f46e5; }
    @media print { body { background: #fff; padding: 0; } .card { box-shadow: none; border-radius: 0; } .header { border-radius: 0; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>كشف الركاب</h1>
      <div class="sub">${esc(trip.fromCity)} → ${esc(trip.toCity)} | ${new Date(trip.departureDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} ${esc(trip.departureTime || '')}</div>
    </div>
    <div class="body">
      <div class="info">
        <div class="info-item"><span class="label">رقم الرحلة</span><span class="value">${esc(trip.id?.slice(0, 8)) || '—'}</span></div>
        <div class="info-item"><span class="label">الحافلة</span><span class="value">${esc(trip.Bus?.name) || '—'}</span></div>
        <div class="info-item"><span class="label">المسار</span><span class="value">${esc(trip.fromCity)} → ${esc(trip.toCity)}</span></div>
        <div class="info-item"><span class="label">المقاعد</span><span class="value">${esc(trip.Bus?.chairs) || '—'} مقعد</span></div>
        <div class="info-item"><span class="label">عدد الركاب</span><span class="value"><span class="badge">${totalPassengers}</span></span></div>
        <div class="info-item"><span class="label">الحجوزات</span><span class="value"><span class="badge">${bookings.length}</span></span></div>
        <div class="info-item"><span class="label">رقم اللوحة</span><span class="value">${plate}</span></div>
        <div class="info-item"><span class="label">تاريخ التقرير</span><span class="value">${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>الجنس</th>
            <th>العمر</th>
            <th>المقعد</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px">لا يوجد ركاب مؤكدين</td></tr>'}</tbody>
      </table>
    </div>
    <div class="footer">
      <span>تم الإنشاء بواسطة منصة تفية</span>
      <span>Tafiya</span>
    </div>
  </div>
  <script>window.print()</script>
</body>
</html>`;
  }

  async generatePassengersPdf(tripId: string, bookings: any[], actor: Actor) {
    // The trip metadata always comes from the database — client-supplied trip
    // objects are never trusted.
    const trip = await this.getOwnedTrip(tripId, actor);
    return this.pdfService.generatePassengerList(
      trip,
      Array.isArray(bookings) ? bookings : [],
    );
  }

  async downloadPassengers(tripId: string, actor: Actor) {
    const trip = await this.getOwnedTrip(tripId, actor);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tripId,
        status: 'CONFIRMED' as any,
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.pdfService.generatePassengerList(trip, bookings);
  }

  private blockedSeatsKey(tripId: string): string {
    return `blocked-seats:${tripId}`;
  }

  async blockSeat(
    tripId: string,
    seatNumber: number,
    note: string | undefined,
    actor: Actor,
  ) {
    await this.getOwnedTrip(tripId, actor);

    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        tripId,
        seatNumbers: { hasSome: [seatNumber] },
        status: { in: ['PENDING', 'CONFIRMED'] as any },
      },
      select: { id: true },
    });
    if (existingBooking) {
      throw new BadRequestException('المقعد محجوز بالفعل');
    }

    const key = this.blockedSeatsKey(tripId);
    const raw = await this.redisService.get(key);
    const blocked: number[] = raw ? JSON.parse(raw) : [];

    if (blocked.includes(seatNumber)) {
      throw new BadRequestException('المقعد محجوز بالفعل');
    }

    blocked.push(seatNumber);
    await this.redisService.set(key, JSON.stringify(blocked));

    this.wsGateway.emitSeatUpdate(tripId, {
      seatNumbers: [seatNumber],
      action: 'booked',
    });

    return { blockedSeats: blocked, message: 'تم حجز المقعد' };
  }

  async unblockSeat(tripId: string, seatNumber: number, actor: Actor) {
    await this.getOwnedTrip(tripId, actor);

    const key = this.blockedSeatsKey(tripId);
    const raw = await this.redisService.get(key);
    const blocked: number[] = raw ? JSON.parse(raw) : [];

    const updated = blocked.filter((s) => s !== seatNumber);
    if (updated.length === blocked.length) {
      throw new NotFoundException('المقعد غير موجود في الحجوزات المكتبية');
    }

    if (updated.length === 0) {
      await this.redisService.del(key);
    } else {
      await this.redisService.set(key, JSON.stringify(updated));
    }

    this.wsGateway.emitSeatUpdate(tripId, {
      seatNumbers: [seatNumber],
      action: 'released',
    });

    return { blockedSeats: updated, message: 'تم إلغاء حجز المقعد' };
  }

  async getBlockedSeats(tripId: string): Promise<number[]> {
    const key = this.blockedSeatsKey(tripId);
    const raw = await this.redisService.get(key);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Office (walk-in) booking by company staff. Serialized per trip so two
   * concurrent requests can never both pass the availability check.
   */
  async createBooking(
    tripId: string,
    seatNumbers: number[],
    passenger: any,
    customerId: string,
    actor: Actor,
  ) {
    const result = await this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tripId}))::text`;

      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { Bus: true },
      });
      if (!trip) throw new NotFoundException('الرحلة غير موجودة');

      this.assertOwnership(trip, actor);

      if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
        throw new BadRequestException('يجب اختيار مقعد واحد على الأقل');
      }

      const sanitizedSeats = sanitizeSeats(seatNumbers);

      if (
        trip.Bus &&
        Number.isFinite(trip.Bus.chairs) &&
        (sanitizedSeats.some((s) => s > trip.Bus.chairs) ||
          sanitizedSeats.length > trip.Bus.chairs)
      ) {
        throw new BadRequestException('رقم المقعد غير صالح لهذه الحافلة');
      }

      const existingBooking = await tx.booking.findFirst({
        where: {
          tripId,
          seatNumbers: { hasSome: sanitizedSeats },
          status: { in: ['PENDING', 'CONFIRMED'] as any },
        },
        select: { id: true },
      });
      if (existingBooking) {
        throw new BadRequestException('المقعد محجوز بالفعل');
      }

      const blocked = await this.getBlockedSeats(tripId);
      if (sanitizedSeats.some((s) => blocked.includes(s))) {
        throw new BadRequestException('المقعد محجوز بالفعل');
      }

      const booking = await tx.booking.create({
        data: {
          tripId,
          customerId,
          seatNumbers: sanitizedSeats,
          passenger: passenger,
          passengerContact: 'STATIONARY',
          status: 'CONFIRMED' as any,
        },
        include: { Trip: true, TicketPDF: true },
      });

      return { booking, sanitizedSeats, blocked };
    });

    const key = this.blockedSeatsKey(tripId);
    const updatedBlocked = [...result.blocked, ...result.sanitizedSeats];
    await this.redisService.set(key, JSON.stringify(updatedBlocked));

    this.wsGateway.emitSeatUpdate(tripId, {
      seatNumbers: result.sanitizedSeats,
      action: 'booked',
    });

    return result.booking;
  }

  async cancelBooking(bookingId: string, actor: Actor) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { Trip: { include: { Bus: { select: { companyId: true } } } } },
    });
    if (!booking) throw new NotFoundException('الحجز غير موجود');

    this.assertOwnership(booking.Trip, actor);

    await this.prisma.booking.delete({ where: { id: bookingId } });

    const key = this.blockedSeatsKey(booking.tripId);
    const raw = await this.redisService.get(key);
    const blocked: number[] = raw ? JSON.parse(raw) : [];
    const updated = blocked.filter((s) => !booking.seatNumbers.includes(s));
    if (updated.length === 0) {
      await this.redisService.del(key);
    } else {
      await this.redisService.set(key, JSON.stringify(updated));
    }

    this.wsGateway.emitSeatUpdate(booking.tripId, {
      seatNumbers: booking.seatNumbers,
      action: 'released',
    });

    return { message: 'تم إلغاء الحجز' };
  }

  async getTripBookings(tripId: string, actor: Actor) {
    await this.getOwnedTrip(tripId, actor);

    return this.prisma.booking.findMany({
      where: { tripId },
      include: {
        TicketPDF: true,
        Customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
