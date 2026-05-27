import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RedisService } from '@app/redis';
import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';
import { PDFService } from '@app/pdf';
import { CreateTripDto, UpdateTripDto } from '../dto/trips.dto';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: RihlaWsGateway,
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
    const trips = await this.prisma.trip.findMany({
      where: { status: 'SCHEDULED' },
      include: {
        Bus: true,
        Booking: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] as any } },
          select: { seatNumbers: true },
        },
      },
    });

    return trips.filter((t) => {
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

    const availableTrips = trips.filter((t) => {
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
