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
  // UseGuards,
  Req,
  // UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
// import { AuthGuard } from '@nestjs/passport';
import { TripsService } from '../service/trips.service';
import { CreateTripDto, UpdateTripDto } from '../dto/trips.dto';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('post-trip')
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() createTripDto: CreateTripDto) {
    return this.tripsService.create(createTripDto);
  }

  @Get('get-trips')
  async getTrips(@Query('status') status?: string) {
    return this.tripsService.getTrips(status);
  }

  @Get('available')
  async getAvailableTrips() {
    return this.tripsService.getAvailableTrips();
  }

  @Get('get-trips/property/:property/value/:value')
  async getTripsByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
    @Query('status') status?: string,
  ) {
    return this.tripsService.getTripsByProperty(property, value, status);
  }

  @Get('get-trip/property/:property/value/:value')
  async getTrip(
    @Param('property') property: string,
    @Param('value') value: string,
  ) {
    return this.tripsService.getTrip(property, value);
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

  @Put('update-trip/:id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    return this.tripsService.update(id, updateTripDto);
  }

  @Delete('delete-trip/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.tripsService.remove(id);
  }

  @Get('download-passengers/:tripId')
  async downloadPassengers(@Param('tripId') tripId: string, @Res() res: Response) {
    const result = await this.tripsService.downloadPassengers(tripId);
    res.download(result.filePath, `passengers_${tripId}.pdf`);
  }

  @Get('get-passengers-pdf/:tripId')
  async getPassengersPdf(@Param('tripId') tripId: string) {
    const result = await this.tripsService.downloadPassengers(tripId);
    return { url: result.publicUrl };
  }

  @Post('generate-passengers-pdf')
  @HttpCode(HttpStatus.OK)
  async generatePassengersPdf(@Body() body: { trip: any; bookings: any[] }) {
    if (!body.trip?.id) throw new HttpException('trip data is required', 400);
    const result = await this.tripsService.generatePassengersPdf(body.trip, body.bookings || []);
    return { url: result.publicUrl };
  }

  @Post('block-seat/:tripId')
  @HttpCode(HttpStatus.OK)
  async blockSeat(
    @Param('tripId') tripId: string,
    @Body() body: { seatNumber: number; note?: string },
  ) {
    return this.tripsService.blockSeat(tripId, body.seatNumber, body.note);
  }

  @Delete('unblock-seat/:tripId/:seatNumber')
  @HttpCode(HttpStatus.OK)
  async unblockSeat(
    @Param('tripId') tripId: string,
    @Param('seatNumber') seatNumber: string,
  ) {
    return this.tripsService.unblockSeat(tripId, parseInt(seatNumber, 10));
  }

  @Get('blocked-seats/:tripId')
  async getBlockedSeats(@Param('tripId') tripId: string) {
    const seats = await this.tripsService.getBlockedSeats(tripId);
    return { blockedSeats: seats };
  }

  @Post('create-booking/:tripId')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Param('tripId') tripId: string,
    @Body() body: { seatNumbers: number[]; passenger: any; customerId: string },
  ) {
    return this.tripsService.createBooking(tripId, body.seatNumbers, body.passenger, body.customerId);
  }

  @Delete('cancel-booking/:bookingId')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(@Param('bookingId') bookingId: string) {
    return this.tripsService.cancelBooking(bookingId);
  }

  @Get('bookings/:tripId')
  async getTripBookings(@Param('tripId') tripId: string) {
    return this.tripsService.getTripBookings(tripId);
  }
}
