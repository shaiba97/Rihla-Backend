import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RedisService } from '@app/redis';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
import { PDFService } from '@app/pdf';
import { CreateTripDto, UpdateTripDto } from '../dto/trips.dto';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: TafiyaWsGateway,
    private readonly pdfService: PDFService,
    private readonly redisService: RedisService,
  ) {}

  async create(createTripDto: CreateTripDto) {
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

    const trip = await this.prisma.trip.create({
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

    if (bus) {
      this.wsGateway.emitToRoom('company:' + bus.companyId, WS_EVENTS.TRIP_CREATED, trip);
    }
    this.wsGateway.emitToAdmin(WS_EVENTS.TRIP_CREATED, trip);
    this.wsGateway.emitPublic(WS_EVENTS.TRIP_CREATED, trip);

    return {
      success: true,
      message: 'تم إنشاء الرحلة بنجاح',
      data: trip,
    };
  }

  async getTrips(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    return this.prisma.trip.findMany({
      where,
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

  async getTripsByProperty(property: string, value: string, status?: string) {
    const where: any = { [property]: value };
    if (status) where.status = status;
    return this.prisma.trip.findMany({
      where,
      include: {
        Bus: true,
        Booking: { include: { TicketPDF: true } },
      },
    });
  }

  // async searchTrips(searchCriteria: {
  //   fromCity: string;
  //   toCity: string;
  //   departureDate: any | Date;
  // }) {
  //   const trips = await this.prisma.trip.findMany({
  //     where: {
  //       fromCity: searchCriteria.fromCity,
  //       toCity: searchCriteria.toCity,
  //       departureDate: {
  //         gte: new Date(searchCriteria.departureDate),
  //       },
  //     },
  //     include: {
  //       bus: true,
  //     },
  //     orderBy: [{ departureDate: 'asc' }],
  //   });

  //   console.log(trips);

  //   return {
  //     success: true,
  //     message: `تم العثور على ${trips.length} رحلة`,
  //     data: trips,
  //     count: trips.length,
  //   };
  // }

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
    todayStart.setHours(0, 0, 0, 0);
    where.departureDate = { gte: todayStart };

    if (searchCriteria.departureDate) {
      const parsedDate = new Date(searchCriteria.departureDate);
      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setHours(0, 0, 0, 0);
        where.departureDate = { gte: parsedDate };
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

  async getTrip(property: string, value: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { [property]: value },
      include: {
        Bus: true,
        Booking: { include: { TicketPDF: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('الرحلة غير موجودة');
    }

    return trip;
  }

  async update(id: string, updateTripDto: UpdateTripDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });

    if (!trip) {
      throw new NotFoundException('الرحلة غير موجودة');
    }

    if (updateTripDto.busId) {
      const bus = await this.prisma.bus.findUnique({
        where: { id: updateTripDto.busId },
      });

      if (!bus) {
        throw new NotFoundException('CANT FIND BUS');
      }
    }

    const updateData: any = {};

    if (updateTripDto.busId !== undefined)
      updateData.busId = updateTripDto.busId;
    if (updateTripDto.presenceTime !== undefined)
      updateData.presence_time = updateTripDto.presenceTime;
    if (updateTripDto.departureDate !== undefined)
      updateData.departureDate = new Date(updateTripDto.departureDate);
    if (updateTripDto.departureTime !== undefined)
      updateData.departureTime = new Date(updateTripDto.departureTime);
    if (updateTripDto.fromState !== undefined)
      updateData.fromState = updateTripDto.fromState;
    if (updateTripDto.fromCity !== undefined)
      updateData.fromCity = updateTripDto.fromCity;
    if (updateTripDto.fromStation !== undefined)
      updateData.fromStation = updateTripDto.fromStation;
    if (updateTripDto.arrivalTime !== undefined)
      updateData.arrivalTime = updateTripDto.arrivalTime;
    if (updateTripDto.arrivalDate !== undefined)
      updateData.arrivalDate = updateTripDto.arrivalDate;
    if (updateTripDto.toState !== undefined)
      updateData.toState = updateTripDto.toState;
    if (updateTripDto.toCity !== undefined)
      updateData.toCity = updateTripDto.toCity;
    if (updateTripDto.toStation !== undefined)
      updateData.toStation = updateTripDto.toStation;
    if (updateTripDto.status !== undefined)
      updateData.status = updateTripDto.status;

    const updatedTrip = await this.prisma.trip.update({
      where: { id },
      data: updateData,
      include: {
        Bus: true,
        Booking: { include: { TicketPDF: true } },
      },
    });

    const bus = updatedTrip.Bus;
    if (bus) {
      this.wsGateway.emitToRoom('company:' + bus.companyId, WS_EVENTS.TRIP_UPDATED, updatedTrip);
    }
    this.wsGateway.emitToAdmin(WS_EVENTS.TRIP_UPDATED, updatedTrip);
    this.wsGateway.emitPublic(WS_EVENTS.TRIP_UPDATED, updatedTrip);

    return {
      success: true,
      message: 'trip updated successfully',
      data: updatedTrip,
    };
  }

  async remove(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { Bus: true },
    });

    if (!trip) {
      throw new NotFoundException('trip not found');
    }

    const bus = (trip as any).Bus;
    await this.prisma.trip.delete({ where: { id } });

    if (bus) {
      this.wsGateway.emitToRoom('company:' + bus.companyId, WS_EVENTS.TRIP_DELETED, { id });
    }
    this.wsGateway.emitToAdmin(WS_EVENTS.TRIP_DELETED, { id });
    this.wsGateway.emitPublic(WS_EVENTS.TRIP_DELETED, { id });

    return {
      success: true,
      message: 'trip deleted successfully',
    };
  }

  async getPassengerListData(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { Bus: { select: { name: true, chairs: true, plate: true } } },
    });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة');

    const bookings = await this.prisma.booking.findMany({
      where: { tripId, status: 'CONFIRMED' as any },
      orderBy: { createdAt: 'asc' },
    });

    return { trip, bookings };
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
              <td>${p.name || '—'}</td>
              <td>${p.gender === 'MALE' ? 'ذكر' : p.gender === 'FEMALE' ? 'أنثى' : p.gender || '—'}</td>
              <td>${p.age ?? '—'}</td>
              <td>${b.seatNumbers?.join('، ') || '—'}</td>
            </tr>`
          )
          .join('');
      })
      .join('');

    const totalPassengers = bookings.reduce(
      (sum: number, b: any) => sum + (Array.isArray(b.passenger) ? b.passenger.length : 0),
      0,
    );

    const plate = trip.Bus?.plate
      ? typeof trip.Bus.plate === 'object'
        ? (trip.Bus.plate as any).arabic || JSON.stringify(trip.Bus.plate)
        : trip.Bus.plate
      : '—';

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>كشف الركاب - ${trip.fromCity} → ${trip.toCity}</title>
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
      <div class="sub">${trip.fromCity} → ${trip.toCity} | ${new Date(trip.departureDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} ${trip.departureTime || ''}</div>
    </div>
    <div class="body">
      <div class="info">
        <div class="info-item"><span class="label">رقم الرحلة</span><span class="value">${trip.id?.slice(0, 8) || '—'}</span></div>
        <div class="info-item"><span class="label">الحافلة</span><span class="value">${trip.Bus?.name || '—'}</span></div>
        <div class="info-item"><span class="label">المسار</span><span class="value">${trip.fromCity} → ${trip.toCity}</span></div>
        <div class="info-item"><span class="label">المقاعد</span><span class="value">${trip.Bus?.chairs || '—'} مقعد</span></div>
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

  async generatePassengersPdf(trip: any, bookings: any[]) {
    return this.pdfService.generatePassengerList(trip, bookings);
  }

  async downloadPassengers(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة');

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

  async blockSeat(tripId: string, seatNumber: number, note?: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة');

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

  async unblockSeat(tripId: string, seatNumber: number) {
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

  async createBooking(tripId: string, seatNumbers: number[], passenger: any, customerId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, include: { Bus: true } });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة');

    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      throw new BadRequestException('يجب اختيار مقعد واحد على الأقل');
    }

    const sanitizedSeats = seatNumbers.map(Number);

    const existingBooking = await this.prisma.booking.findFirst({
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
    const hasBlocked = sanitizedSeats.some(s => blocked.includes(s));
    if (hasBlocked) {
      throw new BadRequestException('المقعد محجوز بالفعل');
    }

    const booking = await this.prisma.booking.create({
      data: {
        tripId,
        customerId,
        seatNumbers: sanitizedSeats,
        passenger: passenger as any,
        passengerContact: 'STATIONARY',
        status: 'CONFIRMED' as any,
      },
      include: { Trip: true, TicketPDF: true },
    });

    const key = this.blockedSeatsKey(tripId);
    const updatedBlocked = [...blocked, ...sanitizedSeats];
    await this.redisService.set(key, JSON.stringify(updatedBlocked));

    this.wsGateway.emitSeatUpdate(tripId, {
      seatNumbers: sanitizedSeats,
      action: 'booked',
    });

    return booking;
  }

  async cancelBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { Trip: true },
    });
    if (!booking) throw new NotFoundException('الحجز غير موجود');

    await this.prisma.booking.delete({ where: { id: bookingId } });

    const key = this.blockedSeatsKey(booking.tripId);
    const raw = await this.redisService.get(key);
    const blocked: number[] = raw ? JSON.parse(raw) : [];
    const updated = blocked.filter(s => !booking.seatNumbers.includes(s));
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

  async getTripBookings(tripId: string) {
    return this.prisma.booking.findMany({
      where: { tripId },
      include: { TicketPDF: true, Customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
