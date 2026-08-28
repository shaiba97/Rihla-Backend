import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Put,
  Res,
  UnauthorizedException,
  Req,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { TripsService, Actor } from '../service/trips.service';
import { CreateTripDto, UpdateTripDto } from '../dto/trips.dto';
import { UsersService } from '../../users/service/users.service';

const actorOf = (req: Request): Actor => ({
  id: (req as any).user?.id,
  role: (req as any).user?.role,
});

@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  // ------------------------------------------------------------------
  // Public trip discovery (used unauthenticated by the customer app).
  // Responses are sanitized — no passenger PII.
  // ------------------------------------------------------------------

  @Get('available')
  async getAvailableTrips() {
    return this.tripsService.getAvailableTrips();
  }

  @Get('blocked-seats/:tripId')
  async getBlockedSeats(@Param('tripId') tripId: string) {
    const seats = await this.tripsService.getBlockedSeats(tripId);
    return { blockedSeats: seats };
  }

  @Get('customers/lookup')
  @UseGuards(AuthGuard('jwt'))
  async lookupCustomer(
    @Query('email') email?: string,
    @Query('phone') phone?: string,
  ) {
    const customer = await this.usersService.lookupCustomer(email, phone);
    if (!customer) {
      throw new HttpException('المستخدم غير موجود', HttpStatus.NOT_FOUND);
    }
    return { success: true, data: customer };
  }

  @Get('office-customer')
  @UseGuards(AuthGuard('jwt'))
  async getOfficeCustomer() {
    const office = await this.usersService.ensureOfficeCustomer();
    return { success: true, data: office };
  }

  @Get('get-trips/property/:property/value/:value')
  async getTripsByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
    @Query('status') status?: string,
  ) {
    return this.tripsService.getPublicTripsByProperty(property, value, status);
  }

  @Get('get-trip/property/:property/value/:value')
  async getTrip(
    @Param('property') property: string,
    @Param('value') value: string,
  ) {
    return this.tripsService.getPublicTrip(property, value);
  }

  @Post('search-trips')
  @HttpCode(HttpStatus.OK)
  async searchTrips(
    @Body()
    searchCriteria: {
      fromCity: string;
      toCity: string;
      departureDate: any;
    },
  ) {
    return this.tripsService.searchTrips(searchCriteria);
  }

  // ------------------------------------------------------------------
  // Trip management — authenticated; companies see only their own data.
  // ------------------------------------------------------------------

  @Post('post-trip')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() createTripDto: CreateTripDto) {
    return this.tripsService.create(createTripDto, actorOf(req));
  }

  @Get('get-trips')
  @UseGuards(AuthGuard('jwt'))
  async getTrips(@Query('status') status?: string, @Req() req?: any) {
    return this.tripsService.getTrips(actorOf(req), status);
  }

  @Put('update-trip/:id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    return this.tripsService.update(id, updateTripDto, actorOf(req));
  }

  @Delete('delete-trip/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.tripsService.remove(id, actorOf(req));
  }

  // ------------------------------------------------------------------
  // Office booking management — authenticated company staff only.
  // ------------------------------------------------------------------

  @Post('block-seat/:tripId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async blockSeat(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { seatNumber: number; note?: string },
  ) {
    return this.tripsService.blockSeat(
      tripId,
      body.seatNumber,
      body.note,
      actorOf(req),
    );
  }

  @Delete('unblock-seat/:tripId/:seatNumber')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async unblockSeat(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Param('seatNumber') seatNumber: string,
  ) {
    return this.tripsService.unblockSeat(
      tripId,
      parseInt(seatNumber, 10),
      actorOf(req),
    );
  }

  @Post('create-booking/:tripId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { seatNumbers: number[]; passenger: any; customerId: string },
  ) {
    return this.tripsService.createBooking(
      tripId,
      body.seatNumbers,
      body.passenger,
      body.customerId,
      actorOf(req),
    );
  }

  @Delete('cancel-booking/:bookingId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async cancelBooking(@Req() req: any, @Param('bookingId') bookingId: string) {
    return this.tripsService.cancelBooking(bookingId, actorOf(req));
  }

  @Get('bookings/:tripId')
  @UseGuards(AuthGuard('jwt'))
  async getTripBookings(@Req() req: any, @Param('tripId') tripId: string) {
    return this.tripsService.getTripBookings(tripId, actorOf(req));
  }

  // ------------------------------------------------------------------
  // Passenger documents — accept a valid JWT via Authorization header OR
  // `?token=` query parameter (browser navigation cannot send headers).
  // NOTE: the company frontend must append ?token= to browser-navigation
  // URLs after this change.
  // ------------------------------------------------------------------

  @Get('passenger-list/:tripId')
  async passengerList(
    @Req() req: Request,
    @Param('tripId') tripId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const actor = this.resolveActor(req, token);
    const html = await this.tripsService.passengerListHtml(tripId, actor);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('download-passengers/:tripId')
  async downloadPassengers(
    @Req() req: Request,
    @Param('tripId') tripId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const actor = this.resolveActor(req, token);
    const result = await this.tripsService.downloadPassengers(tripId, actor);
    res.download(result.filePath, `passengers_${tripId}.pdf`);
  }

  @Get('get-passengers-pdf/:tripId')
  async getPassengersPdf(@Req() req: Request, @Param('tripId') tripId: string) {
    const actor = this.resolveActor(req);
    const result = await this.tripsService.downloadPassengers(tripId, actor);
    return { url: result.publicUrl };
  }

  @Post('generate-passengers-pdf')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async generatePassengersPdf(
    @Req() req: any,
    @Body() body: { trip: any; bookings: any[] },
  ) {
    if (!body.trip?.id) throw new HttpException('trip data is required', 400);
    // The trip is re-fetched server-side (with an ownership check); client
    // bookings are only used to render the requested rows.
    const result = await this.tripsService.generatePassengersPdf(
      body.trip.id,
      body.bookings || [],
      actorOf(req),
    );
    return { url: result.publicUrl };
  }

  /**
   * Resolves the caller from a Bearer header or a `?token=` query value.
   * Verifies signature, expiry and blacklist before trusting the identity.
   */
  private resolveActor(req: Request, queryToken?: string): Actor {
    const header = req.headers.authorization;
    const bearer =
      header && header.startsWith('Bearer ') ? header.slice(7) : undefined;
    const token = bearer ?? queryToken;

    if (!token) throw new UnauthorizedException('Token is required');

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET!,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (this.usersService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload?.id || !payload?.role) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return { id: payload.id, role: payload.role };
  }
}
