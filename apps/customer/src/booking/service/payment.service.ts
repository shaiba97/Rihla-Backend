import {
  Injectable,
  NotFoundException,
  BadRequestException,
  // ConflictException,
  // HttpException,
  // HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { PDFService } from '@app/pdf';
import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';
import { PaymentStatus } from '@app/prisma';
import { CreatePaymentDto, UpdatePaymentDto } from '../dto/booking.dto';

export interface CreatePaymentInput {
  bookingId: string;
  customerId: string;
  totalAmount: number;
  companyAmount: number;
  commissionAmount: number;
  currency: string;
  transactionId: string;
  recieptFile: string;
}

export interface CreateSessionPaymentInput {
  sessionId: string;
  customerId: string;
  tripId: string;
  totalAmount: number;
  transactionRef: string;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PDFService,
    private readonly wsGateway: RihlaWsGateway,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // Check if booking exists
    const booking = await this.prisma.booking.findUnique({
      where: { id: createPaymentDto.bookingId },
      include: { Trip: true },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    // Check if payment already exists for this booking
    const existingPayment = await this.prisma.payment.findUnique({
      where: { bookingId: createPaymentDto.bookingId },
    });

    if (existingPayment) {
      throw new BadRequestException('الدفعة موجودة بالفعل لهذا الحجز');
    }

    // Check if transactionId is unique (if provided)
    if (createPaymentDto.transactionId) {
      const existingTransaction = await this.prisma.payment.findUnique({
        where: { transactionId: createPaymentDto.transactionId },
      });

      if (existingTransaction) {
        throw new BadRequestException('رقم المعاملة مستخدم بالفعل');
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: createPaymentDto.bookingId,
        customerId: createPaymentDto.customerId,
        price: createPaymentDto.price || createPaymentDto.totalAmount,
        totalAmount: createPaymentDto.totalAmount,
        companyAmount: createPaymentDto.companyAmount,
        commissionAmount: createPaymentDto.commissionAmount,
        platformFeeAmount: createPaymentDto.platformFeeAmount ?? null,
        currency: createPaymentDto.currency || 'SDG',
        status: createPaymentDto.status || PaymentStatus.PENDING,
        transactionId: createPaymentDto.transactionId,
        receiptFile: createPaymentDto.receiptFile,
        paymentMethod: createPaymentDto.paymentMethod,
      },
      include: { Booking: { include: { Trip: true } } },
    });

    const ticket = await this.generateTicket(booking, payment);

    this.wsGateway.emitToAdmin(WS_EVENTS.PAYMENT_CREATED, {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amount: payment.totalAmount,
      method: payment.paymentMethod,
      status: payment.status,
    });
    this.wsGateway.emitToCustomer(
      payment.customerId,
      WS_EVENTS.PAYMENT_CREATED,
      {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        status: payment.status,
        message: 'تم إنشاء طلب الدفع بنجاح',
      },
    );

    return {
      message: 'تم إنشاء الدفعة بنجاح',
      payment,
      ticket,
    };
  }

  async getPayments() {
    return this.prisma.payment.findMany({
      include: {
        Booking: { include: { Trip: { include: { Bus: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentsByProperties(
    property1: string,
    value1: string,
    property2: string,
    value2: string,
  ) {
    return this.prisma.payment.findMany({
      where: {
        AND: [{ [property1]: value1 }, { [property2]: value2 }],
      },
      include: {
        Booking: { include: { Trip: { include: { Bus: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentsByProperty(property: string, value: string) {
    return this.prisma.payment.findMany({
      where: { [property]: value },
      include: {
        Booking: { include: { Trip: { include: { Bus: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayment(property: string, value: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { [property]: value },
      include: {
        Booking: { include: { Trip: { include: { Bus: true } } } },
      },
    });

    if (!payment) {
      throw new NotFoundException('الدفعة غير موجودة');
    }

    return payment;
  }

  async getPaymentByProperties(
    property1: string,
    value1: string,
    property2: string,
    value2: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        AND: [{ [property1]: value1 }, { [property2]: value2 }],
      },
      include: {
        Booking: { include: { Trip: { include: { Bus: true } } } },
      },
    });

    if (!payment) {
      throw new NotFoundException('الدفعة غير موجودة');
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    // Check if payment exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
      include: { Booking: { include: { Trip: true } } },
    });

    if (!existingPayment) {
      throw new NotFoundException('الدفعة غير موجودة');
    }

    // Build update data
    const updateData: any = {};
    if (updatePaymentDto.bookingId !== undefined)
      updateData.bookingId = updatePaymentDto.bookingId;
    if (updatePaymentDto.customerId !== undefined)
      updateData.customerId = updatePaymentDto.customerId;
    if (updatePaymentDto.totalAmount !== undefined)
      updateData.totalAmount = updatePaymentDto.totalAmount;
    if (updatePaymentDto.companyAmount !== undefined)
      updateData.companyAmount = updatePaymentDto.companyAmount;
    if (updatePaymentDto.commissionAmount !== undefined)
      updateData.commissionAmount = updatePaymentDto.commissionAmount;
    if (updatePaymentDto.currency !== undefined)
      updateData.currency = updatePaymentDto.currency;
    if (updatePaymentDto.status !== undefined)
      updateData.status = updatePaymentDto.status;
    if (updatePaymentDto.transactionId !== undefined)
      updateData.transactionId = updatePaymentDto.transactionId;
    if (updatePaymentDto.receiptFile !== undefined)
      updateData.receiptFile = updatePaymentDto.receiptFile;

    // Update payment
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: updateData,
      include: { Booking: { include: { Trip: { include: { Bus: true } } } } },
    });

    return {
      message: 'تم تحديث الدفعة بنجاح',
      payment: updatedPayment,
    };
  }

  async delete(id: string) {
    // Check if payment exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw new NotFoundException('الدفعة غير موجودة');
    }

    await this.prisma.payment.delete({
      where: { id },
    });

    this.wsGateway.emitToAdmin(WS_EVENTS.PAYMENT_REJECTED, {
      paymentId: id,
      bookingId: existingPayment.bookingId,
    });

    return { message: 'تم حذف الدفعة بنجاح' };
  }

  async generateTicket(booking: any, paymentData?: any) {
    const ticketResult = await this.pdfService.generateTicket(
      booking.id as string,
      paymentData,
    );
    const existingTicket = await this.prisma.ticketPDF.findUnique({
      where: { bookingId: booking.id },
    });

    const ticketRecord = existingTicket
      ? await this.prisma.ticketPDF.update({
          where: { bookingId: booking.id },
          data: { ticketUrl: ticketResult.publicUrl, generatedAt: new Date() },
        })
      : await this.prisma.ticketPDF.create({
          data: {
            bookingId: booking.id,
            ticketUrl: ticketResult.publicUrl,
            generatedAt: new Date(),
          },
        });

    const passengers = Array.isArray(booking.passenger)
      ? booking.passenger
      : [booking.passenger];

    return {
      ticketId: ticketRecord.id,
      bookingId: booking.id,
      qrCode: `BOOKING:${booking.id}`,
      passengerNames: passengers.map((p: any) => p.name),
      ticketUrl: ticketRecord.ticketUrl,
    };
  }
}
