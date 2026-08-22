import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  Put,
  Delete,
  UploadedFile,
  ParseFilePipe,
  FileValidator,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BadRequestException } from '@nestjs/common';
import { BookingService } from '../service/booking.service';
import { PaymentService } from '../service/payment.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CreatePaymentDto,
  UpdatePaymentDto,
  CreateBookingWithPaymentDto,
} from '../dto/booking.dto';

const receiptsDir = path.resolve('./uploads/receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, receiptsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `receipt_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const uploadInterceptor = FileInterceptor('receiptFile', {
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|heic)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'نوع الملف غير مدعوم — الصيغ المسموحة: JPEG, PNG, WebP, HEIC',
        ),
        false,
      );
    }
  },
});

class ArabicFileSizeValidator extends FileValidator<{ maxSize: number }> {
  constructor() {
    super({ maxSize: 5 * 1024 * 1024 });
  }
  isValid(file: Express.Multer.File): boolean {
    return !!file && file.size <= this.validationOptions.maxSize;
  }
  buildErrorMessage(): string {
    return 'حجم الملف كبير جدًا — الحد الأقصى 5 ميجابايت';
  }
}

class ArabicFileTypeValidator extends FileValidator<{ fileType: RegExp }> {
  constructor() {
    super({ fileType: /^image\/(jpeg|jpg|png|webp|heic)$/i });
  }
  isValid(file: Express.Multer.File): boolean {
    return (
      !!file &&
      'mimetype' in file &&
      this.validationOptions.fileType.test(file.mimetype)
    );
  }
  buildErrorMessage(): string {
    return 'نوع الملف غير مدعوم — الصيغ المسموحة: JPEG, PNG, WebP, HEIC';
  }
}

const receiptFilePipe = new ParseFilePipe({
  validators: [new ArabicFileSizeValidator(), new ArabicFileTypeValidator()],
  fileIsRequired: false,
});

const customerIdOf = (req: Request): string => (req as any).user?.id;

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
  ) {}

  // ---- Public reference data & seat availability (non-sensitive) ----

  @Get('active-fee')
  getActiveFee() {
    return this.bookingService.getActivePlatformFee();
  }

  @Get('payment-accounts')
  getActivePaymentAccounts() {
    return this.bookingService.getActivePaymentAccounts();
  }

  @Get('support-contacts')
  getSupportContacts() {
    return this.bookingService.getSupportContacts();
  }

  @Get('get-booked-seats/tripId/:tripId')
  async getBookedSats(@Param('tripId') tripId: string) {
    return await this.bookingService.getBookedSeats(tripId);
  }

  @Get('held-seats/:tripId')
  async getHeldSeats(@Param('tripId') tripId: string) {
    return await this.bookingService.getBookedSeats(tripId);
  }

  // ---- Booking session (authenticated) ----

  @Post('lock-seats')
  @UseGuards(AuthGuard('jwt'))
  async lockSeats(
    @Body() body: { tripId: string; seats: number[] },
    @Req() req: Request,
  ) {
    const customerId = customerIdOf(req);
    return this.bookingService.lockSeats(customerId, body.tripId, body.seats);
  }

  @Post('unlock-seats')
  @UseGuards(AuthGuard('jwt'))
  async unlockSeats(@Body() body: { tripId: string }, @Req() req: Request) {
    const customerId = customerIdOf(req);
    await this.bookingService.unlockSeats(customerId, body.tripId);
    return { message: 'ok' };
  }

  @Post('session-step')
  @UseGuards(AuthGuard('jwt'))
  async sessionStep(
    @Body() body: { tripId: string; step: 'seat' | 'passenger' | 'payment' },
    @Req() req: Request,
  ) {
    const customerId = customerIdOf(req);
    return this.bookingService.updateSessionStep(
      customerId,
      body.tripId,
      body.step,
    );
  }

  @Get('session-state/:tripId')
  @UseGuards(AuthGuard('jwt'))
  async getSessionState(@Param('tripId') tripId: string, @Req() req: Request) {
    const customerId = customerIdOf(req);
    return this.bookingService.getSessionState(customerId, tripId);
  }

  // ---- Booking creation (authenticated; status is always PENDING server-side) ----

  @Post('create-booking')
  @UseGuards(AuthGuard('jwt'))
  createBooking(@Body() dto: CreateBookingDto, @Req() req: Request) {
    return this.bookingService.create(dto, customerIdOf(req));
  }

  @Post('create-booking-with-payment')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(uploadInterceptor)
  async createBookingWithPayment(
    @Req() req: Request,
    @Body() dto: CreateBookingWithPaymentDto,
    @UploadedFile(receiptFilePipe) file?: Express.Multer.File,
  ) {
    const receiptFile = file ? `/uploads/receipts/${file.filename}` : undefined;
    return await this.bookingService.createBookingWithPayment(
      dto,
      customerIdOf(req),
      receiptFile,
    );
  }

  // ---- Booking reads (authenticated; scoped to the requesting customer) ----

  /** Returns only the authenticated customer's bookings. */
  @Get('get-bookings')
  @UseGuards(AuthGuard('jwt'))
  async getBookings(@Req() req: Request) {
    return await this.bookingService.getBookings(customerIdOf(req));
  }

  /** Property lookup restricted to the customer's own bookings. */
  @Get(
    'get-bookings-by-properties/property1/:property1/value1/:value1/property2/:property2/value2/:value2',
  )
  @UseGuards(AuthGuard('jwt'))
  async getBookingsByProperties(
    @Param('property1') property1: string,
    @Param('value1') value1: string,
    @Param('property2') property2: string,
    @Param('value2') value2: string,
    @Req() req: Request,
  ) {
    return await this.bookingService.getBookingsByProperties(
      property1,
      value1,
      property2,
      value2,
      customerIdOf(req),
    );
  }

  /** Property lookup restricted to the customer's own bookings. */
  @Get('get-bookings-by-property/property/:property/value/:value')
  @UseGuards(AuthGuard('jwt'))
  async getBookingsByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
    @Req() req: Request,
  ) {
    return await this.bookingService.getBookingsByProperty(
      property,
      value,
      customerIdOf(req),
    );
  }

  /** Property lookup restricted to the customer's own bookings. */
  @Get('get-booking/property/:property/value/:value')
  @UseGuards(AuthGuard('jwt'))
  async getBooking(
    @Param('property') property: string,
    @Param('value') value: string,
    @Req() req: Request,
  ) {
    return await this.bookingService.getBooking(
      property,
      value,
      customerIdOf(req),
    );
  }

  /** Property lookup restricted to the customer's own bookings. */
  @Get(
    'get-booking-by-properties/property1/:property1/value1/:value1/property2/:property2/value2/:value2',
  )
  @UseGuards(AuthGuard('jwt'))
  async getBookingByProperties(
    @Param('property1') property1: string,
    @Param('value1') value1: string,
    @Param('property2') property2: string,
    @Param('value2') value2: string,
    @Req() req: Request,
  ) {
    return await this.bookingService.getBookingByProperties(
      property1,
      value1,
      property2,
      value2,
      customerIdOf(req),
    );
  }

  // ---- Booking mutation (authenticated owner only) ----

  @Put('update-booking/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateBooking(
    @Param('id') id: string,
    @Body() body: UpdateBookingDto,
    @Req() req: Request,
  ) {
    return await this.bookingService.update(id, body, customerIdOf(req));
  }

  @Delete('delete-booking/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteBooking(@Param('id') id: string, @Req() req: Request) {
    return await this.bookingService.delete(id, customerIdOf(req));
  }

  // ---- Payments ----

  @Post('create-payment')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(uploadInterceptor)
  async createPayment(
    @Req() req: Request,
    @Body() dto: CreatePaymentDto,
    @UploadedFile(receiptFilePipe) file?: Express.Multer.File,
  ) {
    const receiptFile = file ? `/uploads/receipts/${file.filename}` : undefined;
    const paymentData = { ...dto, receiptFile, customerId: customerIdOf(req) };

    return await this.paymentService.create(paymentData);
  }

  @Get('get-payments')
  @UseGuards(AuthGuard('jwt'))
  async getPayments(@Req() req: Request) {
    return await this.paymentService.getPayments(customerIdOf(req));
  }

  @Get('get-payments-by-property/property/:property/value/:value')
  @UseGuards(AuthGuard('jwt'))
  async getPaymentsByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
    @Req() req: Request,
  ) {
    return await this.paymentService.getPaymentsByProperty(
      property,
      value,
      customerIdOf(req),
    );
  }

  @Get('get-payment/property/:property/value/:value')
  @UseGuards(AuthGuard('jwt'))
  async getPayment(
    @Param('property') property: string,
    @Param('value') value: string,
    @Req() req: Request,
  ) {
    return await this.paymentService.getPayment(
      property,
      value,
      customerIdOf(req),
    );
  }

  @Get(
    'get-payment-by-properties/property1/:property1/value1/:value1/property2/:property2/value2/:value2',
  )
  @UseGuards(AuthGuard('jwt'))
  async getPaymentByProperties(
    @Param('property1') property1: string,
    @Param('value1') value1: string,
    @Param('property2') property2: string,
    @Param('value2') value2: string,
    @Req() req: Request,
  ) {
    return await this.paymentService.getPaymentByProperties(
      property1,
      value1,
      property2,
      value2,
      customerIdOf(req),
    );
  }

  @Get(
    'get-payments-by-properties/property1/:property1/value1/:value1/property2/:property2/value2/:value2',
  )
  @UseGuards(AuthGuard('jwt'))
  async getPaymentsByProperties(
    @Param('property1') property1: string,
    @Param('value1') value1: string,
    @Param('property2') property2: string,
    @Param('value2') value2: string,
    @Req() req: Request,
  ) {
    return await this.paymentService.getPaymentsByProperties(
      property1,
      value1,
      property2,
      value2,
      customerIdOf(req),
    );
  }

  @Put('update-payment/:id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(uploadInterceptor)
  async updatePayment(
    @Param('id') id: string,
    @Body() body: UpdatePaymentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const updateData = { ...body };

    if (file) {
      const receiptFile = `/uploads/receipts/${file.filename}`;
      updateData.receiptFile = receiptFile;
    }

    return await this.paymentService.update(id, updateData, customerIdOf(req));
  }

  @Delete('delete-payment/:id')
  @UseGuards(AuthGuard('jwt'))
  async deletePayment(@Param('id') id: string, @Req() req: Request) {
    return await this.paymentService.delete(id, customerIdOf(req));
  }
}
