import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { PDFService } from '@app/pdf';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
import { PaymentStatus } from '@app/prisma';
import { CreatePaymentDto, UpdatePaymentDto } from '../dto/booking.dto';

/** Properties a customer may filter payments by. */
const FILTERABLE_PROPERTIES = [
  'id',
  'bookingId',
  'customerId',
  'status',
] as const;

function assertFilterableProperties(properties: string[]): void {
  for (const p of properties) {
    if (!(FILTERABLE_PROPERTIES as readonly string[]).includes(p)) {
      throw new ForbiddenException('خاصية البحث غير مسموح بها');
    }
  }
}

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
    private readonly wsGateway: TafiyaWsGateway,
  ) {}

  private readonly logger = new Logger(PaymentService.name);

  async create(createPaymentDto: CreatePaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: createPaymentDto.bookingId },
      include: { Trip: true },
    });

    if (!booking) {
      throw new NotFoundException('الحجز غير موجود');
    }

    // A customer can only pay for their own booking.
    if (
      createPaymentDto.customerId &&
      booking.customerId !== createPaymentDto.customerId
    ) {
      throw new ForbiddenException('لا يمكنك الدفع لحجز مستخدم آخر');
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: { bookingId: createPaymentDto.bookingId },
    });

    if (existingPayment) {
      throw new BadRequestException('الدفعة موجودة بالفعل لهذا الحجز');
    }

    if (createPaymentDto.transactionId) {
      const existingTransaction = await this.prisma.payment.findUnique({
        where: { transactionId: createPaymentDto.transactionId },
      });

      if (existingTransaction) {
        throw new BadRequestException('رقم المعاملة مستخدم بالفعل');
      }
    }

    const seatNumbers = booking.seatNumbers ?? [];
    const seatCount = seatNumbers.length;
    const tripPrice = Number(booking.Trip?.price ?? 0);
    const baseAmount = tripPrice * seatCount;

    const activeFee = await this.prisma.platformFee.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const platformFeePct = activeFee ? Number(activeFee.percentage) : 0;
    const platformFeeAmount = Math.round(baseAmount * platformFeePct) / 100;
    const serverCompanyAmount = baseAmount - platformFeeAmount;
    const serverTotalAmount = baseAmount;

    // All financial figures are derived server-side; client-sent amounts are
    // ignored. Status always starts as PENDING — only an admin can confirm.
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: createPaymentDto.bookingId,
        customerId: booking.customerId,
        price: tripPrice,
        totalAmount: serverTotalAmount,
        companyAmount: serverCompanyAmount,
        commissionAmount: platformFeeAmount,
        platformFeeAmount,
        currency: createPaymentDto.currency || 'SDG',
        status: PaymentStatus.PENDING,
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

  /** Only the requesting customer's payments are returned. */
  async getPayments(customerId: string) {
    return this.prisma.payment.findMany({
      where: { customerId },
      include: {
        Booking: { include: { Trip: { include: { Bus: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Filterable properties are allowlisted; results always scoped to the
   *  requesting customer. */
  async getPaymentsByProperties(
    property1: string,
    value1: string,
    property2: string,
    value2: string,
    customerId: string,
  ) {
    assertFilterableProperties([property1, property2]);
    return this.prisma.payment.findMany({
      where: {
        customerId,
        AND: [{ [property1]: value1 }, { [property2]: value2 }],
      },
      include: {
        Booking: { include: { Trip: { include: { Bus: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentsByProperty(
    property: string,
    value: string,
    customerId: string,
  ) {
    assertFilterableProperties([property]);
    const whereClause: any = { customerId };
    whereClause[property] = value;

    return this.prisma.payment.findMany({
      where: whereClause,
      include: {
        Booking: { include: { Trip: { include: { Bus: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayment(property: string, value: string, customerId: string) {
    assertFilterableProperties([property]);
    const whereClause: any = { customerId };
    whereClause[property] = value;

    const payment = await this.prisma.payment.findFirst({
      where: whereClause,
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
    customerId: string,
  ) {
    assertFilterableProperties([property1, property2]);
    const payment = await this.prisma.payment.findFirst({
      where: {
        customerId,
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

  /** Customers may only re-upload a receipt on their own PENDING payment —
   *  amounts and status are never writable here (admin-only concerns). */
  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
    customerId: string,
  ) {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw new NotFoundException('الدفعة غير موجودة');
    }

    if (existingPayment.customerId !== customerId) {
      throw new ForbiddenException('لا يمكنك تعديل دفعة مستخدم آخر');
    }

    const updateData: any = {};
    if (updatePaymentDto.receiptFile !== undefined)
      updateData.receiptFile = updatePaymentDto.receiptFile;
    if (updatePaymentDto.transactionId !== undefined)
      updateData.transactionId = updatePaymentDto.transactionId;
    if (updatePaymentDto.paymentMethod !== undefined)
      updateData.paymentMethod = updatePaymentDto.paymentMethod;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('لا توجد بيانات قابلة للتعديل');
    }

    if (
      updateData.transactionId &&
      updateData.transactionId !== existingPayment.transactionId
    ) {
      const existingTransaction = await this.prisma.payment.findUnique({
        where: { transactionId: updateData.transactionId },
      });
      if (existingTransaction) {
        throw new BadRequestException('رقم المعاملة مستخدم بالفعل');
      }
    }

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

  async delete(id: string, customerId: string) {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw new NotFoundException('الدفعة غير موجودة');
    }

    if (existingPayment.customerId !== customerId) {
      throw new ForbiddenException('لا يمكنك حذف دفعة مستخدم آخر');
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

    const pdfBuffer = ticketResult.buffer ?? null;

    const ticketRecord = existingTicket
      ? await this.prisma.ticketPDF.update({
          where: { bookingId: booking.id },
          data: {
            ticketUrl: ticketResult.publicUrl,
            ...(pdfBuffer ? { pdfData: pdfBuffer } : {}),
            generatedAt: new Date(),
          },
        })
      : await this.prisma.ticketPDF.create({
          data: {
            bookingId: booking.id,
            ticketUrl: ticketResult.publicUrl,
            ...(pdfBuffer ? { pdfData: pdfBuffer } : {}),
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
