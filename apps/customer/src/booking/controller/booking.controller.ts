import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  Put,
  Delete,
  UploadedFile,
  ParseFilePipe,
  FileValidator,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
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
      cb(new BadRequestException('نوع الملف غير مدعوم — الصيغ المسموحة: JPEG, PNG, WebP, HEIC'), false);
    }
  },
});

class ArabicFileSizeValidator extends FileValidator<{ maxSize: number }> {
  constructor() { super({ maxSize: 5 * 1024 * 1024 }); }
  isValid(file: Express.Multer.File): boolean {
    return !!file && file.size <= this.validationOptions.maxSize;
  }
  buildErrorMessage(): string {
    return 'حجم الملف كبير جدًا — الحد الأقصى 5 ميجابايت';
  }
}

class ArabicFileTypeValidator extends FileValidator<{ fileType: RegExp }> {
  constructor() { super({ fileType: /^image\/(jpeg|jpg|png|webp|heic)$/i }); }
  isValid(file: Express.Multer.File): boolean {
    return !!file && 'mimetype' in file && this.validationOptions.fileType.test(file.mimetype);
  }
  buildErrorMessage(): string {
    return 'نوع الملف غير مدعوم — الصيغ المسموحة: JPEG, PNG, WebP, HEIC';
  }
}

const receiptFilePipe = new ParseFilePipe({
  validators: [
    new ArabicFileSizeValidator(),
    new ArabicFileTypeValidator(),
  ],
  fileIsRequired: false,
});

// interface AuthenticatedRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     name: string;
//     role: string;
//   };
//   file?: Express.Multer.File;
// }

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
    // private readonly sessionService: SessionService,
  ) {}

  @Get('active-fee')
  getActiveFee() {
    return this.bookingService.getActivePlatformFee();
  }

  @Post('create-booking')
  @UseGuards(AuthGuard('jwt'))
  createBooking(@Body() dto: CreateBookingDto, @Req() req: Request) {
    return this.bookingService.create(dto, (req as any).user.id);
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

  @Post('lock-seats')
  @UseGuards(AuthGuard('jwt'))
  async lockSeats(@Body() body: { tripId: string; seats: number[] }, @Req() req: Request) {
    const customerId = (req as any).user.id;
    return this.bookingService.lockSeats(customerId, body.tripId, body.seats);
  }

  @Post('unlock-seats')
  @UseGuards(AuthGuard('jwt'))
  async unlockSeats(@Body() body: { tripId: string }, @Req() req: Request) {
    const customerId = (req as any).user.id;
    await this.bookingService.unlockSeats(customerId, body.tripId);
    return { message: 'ok' };
  }

  @Post('session-step')
  @UseGuards(AuthGuard('jwt'))
  async sessionStep(
    @Body() body: { tripId: string; step: 'seat' | 'passenger' | 'payment' },
    @Req() req: Request,
  ) {
    const customerId = (req as any).user.id;
    return this.bookingService.updateSessionStep(customerId, body.tripId, body.step);
  }

  @Get('session-state/:tripId')
  @UseGuards(AuthGuard('jwt'))
  async getSessionState(@Param('tripId') tripId: string, @Req() req: Request) {
    const customerId = (req as any).user.id;
    return this.bookingService.getSessionState(customerId, tripId);
  }

  // @Get('bookings/select-seat/customerId/:customerId/tripId/:tripId')
  @Get('get-bookings')
  async getBookings() {
    return await this.bookingService.getBookings();
  }

  @Get(
    'get-bookings-by-properties/property1/:property1/value1/:value1/property2/:property2/value2/:value2',
  )
  async getBookingsByProperties(
    @Param('property1') property1: string,
    @Param('value1') value1: string,
    @Param('property2') property2: string,
    @Param('value2') value2: string,
  ) {
    return await this.bookingService.getBookingsByProperties(
      property1,
      value1,
      property2,
      value2,
    );
  }

  @Get('get-bookings-by-property/property/:property/value/:value')
  async getBookingsByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
  ) {
    return await this.bookingService.getBookingsByProperty(property, value);
  }

  @Get('get-booking/property/:property/value/:value')
  async getBooking(
    @Param('property') property: string,
    @Param('value') value: string,
  ) {
    return await this.bookingService.getBooking(property, value);
  }

  @Get(
    'get-booking-by-properties/property1/:property1/value1/:value1/property2/:property2/value2/:value2',
  )
  async getBookingByProperties(
    @Param('property1') property1: string,
    @Param('value1') value1: string,
    @Param('property2') property2: string,
    @Param('value2') value2: string,
  ) {
    return await this.bookingService.getBookingByProperties(
      property1,
      value1,
      property2,
      value2,
    );
  }

  @Put('update-booking/:id')
  async updateBooking(@Param('id') id: string, @Body() body: UpdateBookingDto) {
    return await this.bookingService.update(id, body);
  }

  @Delete('delete-booking/:id')
  async deleteBooking(@Param('id') id: string) {
    return await this.bookingService.delete(id);
  }

  // Payment CRUD Endpoints
  @Post('create-payment')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(uploadInterceptor)
  async createPayment(
    @Req() req: Request,
    @Body() dto: CreatePaymentDto,
    @UploadedFile(receiptFilePipe) file?: Express.Multer.File,
  ) {
    const receiptFile = file ? `/uploads/receipts/${file.filename}` : undefined;
    const paymentData = { ...dto, receiptFile, customerId: (req as any).user.id };

    return await this.paymentService.create(paymentData);
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
      (req as any).user.id,
      receiptFile,
    );
  }

  @Get('get-payments')
  async getPayments() {
    return await this.paymentService.getPayments();
  }

  @Get('get-payments-by-property/property/:property/value/:value')
  async getPaymentsByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
  ) {
    return await this.paymentService.getPaymentsByProperty(property, value);
  }

  @Get('get-payment/property/:property/value/:value')
  async getPayment(
    @Param('property') property: string,
    @Param('value') value: string,
  ) {
    return await this.paymentService.getPayment(property, value);
  }

  @Get(
    'get-payment-by-properties/property1/:property1/value1/:value1/property2/:property2/value2/:value2',
  )
  async getPaymentByProperties(
    @Param('property1') property1: string,
    @Param('value1') value1: string,
    @Param('property2') property2: string,
    @Param('value2') value2: string,
  ) {
    return await this.paymentService.getPaymentByProperties(
      property1,
      value1,
      property2,
      value2,
    );
  }

  @Get(
    'get-payments-by-properties/property1/:property1/value1/:value1/property2/:property2/value2/:value2',
  )
  async getPaymentsByProperties(
    @Param('property1') property1: string,
    @Param('value1') value1: string,
    @Param('property2') property2: string,
    @Param('value2') value2: string,
  ) {
    return await this.paymentService.getPaymentsByProperties(
      property1,
      value1,
      property2,
      value2,
    );
  }

  @Put('update-payment/:id')
  @UseInterceptors(uploadInterceptor)
  async updatePayment(
    @Param('id') id: string,
    @Body() body: UpdatePaymentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updateData = { ...body };

    if (file) {
      const receiptFile = `/uploads/receipts/${file.filename}`;
      updateData.receiptFile = receiptFile;
    }

    return await this.paymentService.update(id, updateData);
  }

  @Delete('delete-payment/:id')
  async deletePayment(@Param('id') id: string) {
    return await this.paymentService.delete(id);
  }
}
