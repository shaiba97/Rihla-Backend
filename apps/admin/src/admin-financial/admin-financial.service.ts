import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService, Prisma } from '@app/prisma';
import { PDFService } from '@app/pdf';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
import { NotificationsService } from '../notifications/notifications.service';

type Period =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'half-yearly'
  | 'yearly';

type DashboardPaymentSummary = {
  totalAmount: Prisma.Decimal;
  platformFeeAmount: Prisma.Decimal | null;
  companyAmount: Prisma.Decimal;
  paymentMethod: string | null;
  createdAt: Date;
};

type DashboardBooking = {
  id: string;
  status: string;
  seatNumbers: number[];
  createdAt: Date;
  Trip: { fromCity: string; toCity: string; departureDate: Date } | null;
  Customer: { name: string; phone: string | null } | null;
  Payment: { status: string; totalAmount: Prisma.Decimal } | null;
};

type DashboardPendingPayment = {
  id: string;
  totalAmount: Prisma.Decimal;
  paymentMethod: string | null;
  createdAt: Date;
  Booking: {
    Trip: { fromCity: string; toCity: string } | null;
    Customer: { name: string } | null;
  } | null;
};

type FullPaymentBooking = {
  id: string;
  bookingId: string;
  status: string;
  totalAmount: Prisma.Decimal;
  companyAmount: Prisma.Decimal;
  platformFeeAmount: Prisma.Decimal | null;
  paymentMethod: string | null;
  transactionId: string | null;
  receiptFile: string | null;
  createdAt: Date;
  Booking: {
    status: string;
    seatNumbers: number[];
    Customer?: { id: string; name: string; phone: string | null } | null;
    Trip: {
      fromCity: string;
      toCity: string;
      departureDate: Date;
      departureTime: string;
      Bus: {
        name: string;
        Company: { id: string; name: string } | null;
      } | null;
    } | null;
  } | null;
};

type PendingPaymentDetail = {
  id: string;
  bookingId: string;
  status: string;
  totalAmount: Prisma.Decimal;
  platformFeeAmount: Prisma.Decimal | null;
  companyAmount: Prisma.Decimal;
  paymentMethod: string | null;
  transactionId: string | null;
  receiptFile: string | null;
  createdAt: Date;
  Booking: {
    seatNumbers: number[];
    passenger: any;
    Customer: { id: string; name: string; phone: string | null } | null;
    Trip: {
      fromCity: string;
      toCity: string;
      departureDate: Date;
      departureTime: string;
    } | null;
  } | null;
};

@Injectable()
export class AdminFinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PDFService,
    private readonly wsGateway: TafiyaWsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  private round2(n: number): number {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  async getDashboardSummary() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);
    const last7 = new Date(now);
    last7.setDate(last7.getDate() - 7);

    const [
      totalUsers,
      totalCompanies,
      totalCustomers,
      newUsersToday,
      newUsersThisMonth,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      bookingsToday,
      bookingsThisMonth,
      totalTrips,
      scheduledTrips,
      totalBuses,
      allPayments,
      pendingPaymentsCount,
      totalPaymentAccounts,
      activePaymentAccounts,
    ] = await Promise.all([
      this.prisma.users.count(),
      this.prisma.users.count({ where: { role: 'COMPANY' as any } }),
      this.prisma.users.count({ where: { role: 'USER' as any } }),
      this.prisma.users.count({ where: { createdAt: { gte: today } } }),
      this.prisma.users.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'CONFIRMED' as any } }),
      this.prisma.booking.count({ where: { status: 'PENDING' as any } }),
      this.prisma.booking.count({ where: { status: 'CANCELLED' as any } }),
      this.prisma.booking.count({ where: { createdAt: { gte: today } } }),
      this.prisma.booking.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { status: 'SCHEDULED' as any } }),
      this.prisma.bus.count(),
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS' as any },
        select: {
          totalAmount: true,
          platformFeeAmount: true,
          companyAmount: true,
          paymentMethod: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { status: 'PENDING' as any } }),
      this.prisma.paymentAccount.count(),
      this.prisma.paymentAccount.count({ where: { isActive: true } }),
    ]);

    const totalRevenue = allPayments.reduce(
      (s: number, p: DashboardPaymentSummary) => s + Number(p.totalAmount),
      0,
    );
    const totalPlatformEarnings = allPayments.reduce(
      (s: number, p: DashboardPaymentSummary) =>
        s + Number(p.platformFeeAmount ?? 0),
      0,
    );
    const totalCompanyAmount = allPayments.reduce(
      (s: number, p: DashboardPaymentSummary) => s + Number(p.companyAmount),
      0,
    );
    const revenueThisMonth = allPayments
      .filter(
        (p: DashboardPaymentSummary) => new Date(p.createdAt) >= startOfMonth,
      )
      .reduce(
        (s: number, p: DashboardPaymentSummary) => s + Number(p.totalAmount),
        0,
      );

    const dailyRevenueMap: Record<
      string,
      { revenue: number; earnings: number; bookings: number }
    > = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyRevenueMap[d.toISOString().slice(0, 10)] = {
        revenue: 0,
        earnings: 0,
        bookings: 0,
      };
    }
    allPayments
      .filter((p: DashboardPaymentSummary) => new Date(p.createdAt) >= last30)
      .forEach((p: DashboardPaymentSummary) => {
        const key = new Date(p.createdAt).toISOString().slice(0, 10);
        if (dailyRevenueMap[key]) {
          dailyRevenueMap[key].revenue += Number(p.totalAmount);
          dailyRevenueMap[key].earnings += Number(p.platformFeeAmount ?? 0);
          dailyRevenueMap[key].bookings += 1;
        }
      });
    const dailyRevenue = Object.entries(dailyRevenueMap).map(
      ([date, data]: [
        string,
        { revenue: number; earnings: number; bookings: number },
      ]) => ({ date, ...data }),
    );

    const methodMap: Record<string, number> = {};
    allPayments.forEach((p: DashboardPaymentSummary) => {
      const m = p.paymentMethod ?? 'other';
      methodMap[m] = (methodMap[m] ?? 0) + Number(p.totalAmount);
    });
    const paymentMethodBreakdown = Object.entries(methodMap).map(
      ([method, amount]: [string, number]) => ({ method, amount }),
    );

    const [recentBookings, recentPendingPayments] = await Promise.all([
      this.prisma.booking.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          Trip: {
            select: { fromCity: true, toCity: true, departureDate: true },
          },
          Customer: { select: { name: true, phone: true } },
          Payment: { select: { status: true, totalAmount: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { status: 'PENDING' as any },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          Booking: {
            include: {
              Trip: { select: { fromCity: true, toCity: true } },
              Customer: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const activeFee = await this.prisma.platformFee.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      platform: {
        activePlatformFee: activeFee
          ? {
              id: activeFee.id,
              percentage: Number(activeFee.percentage),
              label: activeFee.label ?? null,
              isActive: activeFee.isActive,
            }
          : null,
        pendingPaymentsRequiringAction: pendingPaymentsCount,
        totalPaymentAccounts,
        activePaymentAccounts,
      },
      users: {
        total: totalUsers,
        customers: totalCustomers,
        companies: totalCompanies,
        newToday: newUsersToday,
        newThisMonth: newUsersThisMonth,
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        pending: pendingBookings,
        cancelled: cancelledBookings,
        today: bookingsToday,
        thisMonth: bookingsThisMonth,
        confirmationRate:
          totalBookings > 0
            ? Math.round((confirmedBookings / totalBookings) * 100)
            : 0,
      },
      operations: { totalTrips, activeTrips: scheduledTrips, totalBuses },
      revenue: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPlatformEarnings: Math.round(totalPlatformEarnings * 100) / 100,
        totalCompanyAmount: Math.round(totalCompanyAmount * 100) / 100,
        revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
        totalSuccessfulTransactions: allPayments.length,
        dailyRevenue,
        paymentMethodBreakdown: paymentMethodBreakdown.map((m) => ({
          ...m,
          amount: Math.round(m.amount * 100) / 100,
        })),
      },
      recentBookings: recentBookings.map((b: DashboardBooking) => ({
        id: b.id,
        customerName: b.Customer?.name ?? '—',
        from: b.Trip?.fromCity ?? '—',
        to: b.Trip?.toCity ?? '—',
        date: b.Trip?.departureDate,
        seatNumber: b.seatNumbers?.[0] ?? 0,
        status: b.status,
        paymentStatus: b.Payment?.status,
        amount: this.round2(Number(b.Payment?.totalAmount ?? 0)),
        createdAt: b.createdAt,
      })),
      pendingActions: recentPendingPayments.map(
        (p: DashboardPendingPayment) => ({
          id: p.id,
          customerName: p.Booking?.Customer?.name ?? '—',
          from: p.Booking?.Trip?.fromCity ?? '—',
          to: p.Booking?.Trip?.toCity ?? '—',
          amount: this.round2(Number(p.totalAmount)),
          paymentMethod: p.paymentMethod,
          createdAt: p.createdAt,
        }),
      ),
    };
  }

  async getOverview() {
    const [
      allPayments,
      pendingPayments,
      confirmedPayments,
      bookingStats,
      activeFee,
      totalExpenses,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        include: {
          Booking: {
            include: {
              Trip: {
                include: {
                  Bus: {
                    include: { Company: { select: { id: true, name: true } } },
                  },
                },
              },
              Customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'SUCCESS' } }),
      this.prisma.booking.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.platformFee.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);

    const successPayments = allPayments.filter(
      (p: FullPaymentBooking) => p.status === 'SUCCESS',
    );
    const totalRevenue = successPayments.reduce(
      (s: number, p: FullPaymentBooking) => s + Number(p.totalAmount ?? 0),
      0,
    );
    const totalPlatformEarnings = successPayments.reduce(
      (s: number, p: FullPaymentBooking) =>
        s + Number(p.platformFeeAmount ?? 0),
      0,
    );
    const totalCompanyAmount = successPayments.reduce(
      (s: number, p: FullPaymentBooking) => s + Number(p.companyAmount ?? 0),
      0,
    );

    const monthlyMap: Record<
      string,
      { revenue: number; earnings: number; count: number }
    > = {};
    successPayments.forEach((p: FullPaymentBooking) => {
      const key = new Date(p.createdAt).toISOString().slice(0, 7);
      if (!monthlyMap[key])
        monthlyMap[key] = { revenue: 0, earnings: 0, count: 0 };
      monthlyMap[key].revenue += Number(p.totalAmount ?? 0);
      monthlyMap[key].earnings += Number(p.platformFeeAmount ?? 0);
      monthlyMap[key].count += 1;
    });
    const monthlyBreakdown = Object.entries(monthlyMap)
      .map(
        ([month, d]: [
          string,
          { revenue: number; earnings: number; count: number },
        ]) => ({ month, ...d }),
      )
      .sort(
        (
          a: {
            month: string;
            revenue: number;
            earnings: number;
            count: number;
          },
          b: {
            month: string;
            revenue: number;
            earnings: number;
            count: number;
          },
        ) => a.month.localeCompare(b.month),
      )
      .slice(-12);

    const bm: Record<string, number> = {};
    bookingStats.forEach((b: { status: string; _count: { id: number } }) => {
      bm[b.status] = b._count.id;
    });

    const totalExpensesVal = Number(totalExpenses._sum.amount ?? 0);

    return {
      totalRevenue: this.round2(totalRevenue),
      totalCompanyAmount: this.round2(totalCompanyAmount),
      totalPlatformEarnings: this.round2(totalPlatformEarnings),
      totalExpenses: this.round2(totalExpensesVal),
      netRevenue: this.round2(totalPlatformEarnings - totalExpensesVal),
      totalTransactions: successPayments.length,
      pendingPayments,
      confirmedPayments,
      activeFee: activeFee
        ? {
            id: activeFee.id,
            percentage: Number(activeFee.percentage),
            label: activeFee.label ?? null,
            isActive: activeFee.isActive,
            createdAt: activeFee.createdAt,
          }
        : null,
      monthlyBreakdown: monthlyBreakdown.map(
        (m: {
          month: string;
          revenue: number;
          earnings: number;
          count: number;
        }) => ({
          month: m.month,
          revenue: this.round2(m.revenue),
          earnings: this.round2(m.earnings),
          count: m.count,
        }),
      ),
      bookingStatus: {
        pending: bm['PENDING'] ?? 0,
        confirmed: bm['CONFIRMED'] ?? 0,
        cancelled: bm['CANCELLED'] ?? 0,
      },
      allTransactions: allPayments.length,
      recentPayments: allPayments.map((p: FullPaymentBooking) => ({
        id: p.id,
        status: p.status,
        totalAmount: this.round2(Number(p.totalAmount)),
        platformFeeAmount: this.round2(Number(p.platformFeeAmount ?? 0)),
        companyAmount: this.round2(Number(p.companyAmount ?? 0)),
        paymentMethod: p.paymentMethod,
        transactionId: p.transactionId,
        recieptFile: p.receiptFile,
        createdAt: p.createdAt,
        bookingId: p.bookingId,
        bookingStatus: p.Booking?.status,
        seatNumbers: p.Booking?.seatNumbers,
        customer: {
          name: p.Booking?.Customer?.name,
          phone: p.Booking?.Customer?.phone,
        },
        trip: {
          from: p.Booking?.Trip?.fromCity,
          to: p.Booking?.Trip?.toCity,
          date: p.Booking?.Trip?.departureDate,
          time: p.Booking?.Trip?.departureTime,
          bus: p.Booking?.Trip?.Bus
            ? {
                name: p.Booking.Trip.Bus.name,
                company: { name: p.Booking.Trip.Bus.Company?.name ?? '' },
              }
            : null,
        },
      })),
    };
  }

  async getPendingPayments() {
    const payments: PendingPaymentDetail[] = await this.prisma.payment.findMany(
      {
        where: { status: 'PENDING' },
        include: {
          Booking: {
            include: {
              Trip: true,
              Customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    );
    return payments.map((p: PendingPaymentDetail) => ({
      id: p.id,
      status: p.status,
      totalAmount: this.round2(Number(p.totalAmount)),
      platformFeeAmount: this.round2(Number(p.platformFeeAmount ?? 0)),
      companyAmount: this.round2(Number(p.companyAmount ?? 0)),
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId,
      recieptFile: p.receiptFile,
      createdAt: p.createdAt,
      bookingId: p.bookingId,
      seatNumbers: p.Booking?.seatNumbers,
      passenger: this.normalizePassengerData(p.Booking?.passenger),
      customer: {
        name: p.Booking?.Customer?.name,
        phone: p.Booking?.Customer?.phone,
      },
      trip: {
        from: p.Booking?.Trip?.fromCity,
        to: p.Booking?.Trip?.toCity,
        date: p.Booking?.Trip?.departureDate,
        time: p.Booking?.Trip?.departureTime,
      },
    }));
  }

  async confirmPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { Booking: true },
    });
    if (!payment) throw new NotFoundException('الدفعة غير موجودة');
    if (payment.status !== 'PENDING')
      throw new BadRequestException('يمكن تأكيد الدفعات المعلقة فقط');

    await this.prisma.$transaction(async (tx: any) => {
      // Atomic claim: only ONE concurrent confirmation can flip PENDING →
      // SUCCESS, so ticket/award side-effects can never run twice.
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: { status: 'SUCCESS' },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('يمكن تأكيد الدفعات المعلقة فقط');
      }
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });
    });

    this.wsGateway.emitToAdmin(WS_EVENTS.PAYMENT_CONFIRMED, {
      paymentId,
      bookingId: payment.bookingId,
    });
    this.wsGateway.emitToRoom(
      'customer:' + payment.Booking?.customerId,
      WS_EVENTS.PAYMENT_CONFIRMED,
      { paymentId, bookingId: payment.bookingId },
    );
    this.wsGateway.emitSeatUpdate(payment.Booking?.tripId ?? '', {
      seatNumbers: payment.Booking?.seatNumbers ?? [],
      action: 'booked',
    });
    this.wsGateway.emitPublic(WS_EVENTS.STATS_UPDATED, {});

    const customerId = payment.Booking?.customerId ?? '';
    if (customerId) {
      await this.notifications.create({
        userId: customerId,
        type: 'BOOKING_CONFIRMED',
        title: 'تم تأكيد حجزك!',
        body: `تم تأكيد حجزك بنجاح. المقعد: ${payment.Booking?.seatNumbers?.join('، ') ?? ''}`,
        data: {
          paymentId,
          bookingId: payment.bookingId,
          seatNumber: payment.Booking?.seatNumbers,
        },
        emitTo: `customer:${customerId}`,
      });
    }

    let ticketUrl = '';
    try {
      const result = await this.pdfService.generateTicket(payment.bookingId);
      ticketUrl = result.publicUrl;
    } catch {
      /* PDF generation not critical */
    }

    this.evaluateAwards(customerId);

    try {
      const phone = payment.Booking?.passengerContact;
      if (phone) {
        const msg = `✅ تم تأكيد حجزك في تفية!\n👤 المقعد: ${payment.Booking?.seatNumbers?.join(',')}\n💰 المبلغ: ${Number(payment.totalAmount)} جنيه${ticketUrl ? '\n🎫 التذكرة: http://localhost:3003' + ticketUrl : ''}`;
        new Logger('WhatsApp').log('📱 WhatsApp (dev): ' + msg);
      }
    } catch {
      /* WhatsApp not available */
    }

    return { message: 'تم تأكيد الدفعة والحجز بنجاح', ticketUrl };
  }

  private async evaluateAwards(customerId: string) {
    try {
      const packs = await this.prisma.awardPack.findMany({
        where: { isActive: true },
        orderBy: { awardValue: 'desc' },
      });
      if (!packs.length) return;

      const highestPack = packs[0];

      const [bookings, existingAwards] = await Promise.all([
        this.prisma.booking.findMany({
          where: { customerId, status: 'CONFIRMED' },
          include: { Payment: { select: { status: true } } },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.userAward.findMany({
          where: { userId: customerId },
          select: { packId: true },
        }),
      ]);

      const earnedPackIds = new Set(existingAwards.map((a) => a.packId));
      const confirmedBookings = bookings.filter(
        (b) => b.Payment?.status === 'SUCCESS',
      );
      const totalBookings = confirmedBookings.length;

      if (
        !earnedPackIds.has(highestPack.id) &&
        totalBookings >= highestPack.minBookings
      ) {
        await this.prisma.userAward.create({
          data: { userId: customerId, packId: highestPack.id },
        });
      }
    } catch (e) {
      Logger.warn(
        'Award evaluation skipped (non-blocking): ' + (e as Error).message,
      );
    }
  }

  async rejectPayment(paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { Booking: true },
    });
    if (!payment) throw new NotFoundException('الدفعة غير موجودة');
    if (payment.status !== 'PENDING')
      throw new BadRequestException('يمكن رفض الدفعات المعلقة فقط');

    await this.prisma.$transaction(async (tx: any) => {
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('يمكن رفض الدفعات المعلقة فقط');
      }
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CANCELLED', cancellationReason: reason || null },
      });
    });
    this.wsGateway.emitToAdmin(WS_EVENTS.PAYMENT_REJECTED, {
      paymentId,
      bookingId: payment.bookingId,
    });
    this.wsGateway.emitToRoom(
      'customer:' + payment.Booking?.customerId,
      WS_EVENTS.PAYMENT_REJECTED,
      { paymentId, bookingId: payment.bookingId },
    );
    this.wsGateway.emitSeatUpdate(payment.Booking?.tripId ?? '', {
      seatNumbers: payment.Booking?.seatNumbers ?? [],
      action: 'released',
    });
    this.wsGateway.emitPublic(WS_EVENTS.STATS_UPDATED, {});

    const customerId = payment.Booking?.customerId ?? '';
    if (customerId) {
      await this.notifications.create({
        userId: customerId,
        type: 'PAYMENT_REJECTED',
        title: 'تم رفض طلب الدفع',
        body: `للأسف تم رفض طلب دفعك${reason ? `. السبب: ${reason}` : ''}. يرجى التواصل مع الدعم.`,
        data: {
          paymentId,
          bookingId: payment.bookingId,
          reason,
        },
        emitTo: `customer:${customerId}`,
      });
    }

    return { message: 'تم رفض الدفعة وإلغاء الحجز' };
  }

  async getEarnings(period: Period = 'monthly') {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'SUCCESS' },
      include: {
        Booking: {
          include: {
            Trip: {
              include: {
                Bus: {
                  include: { Company: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    function getKey(d: Date): string {
      const y = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const m = String(monthNum).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (period === 'daily') return `${y}-${m}-${day}`;
      if (period === 'weekly') {
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        return `${y}-W${String(Math.ceil(((+d - +new Date(y, 0, 1)) / 86400000 + new Date(y, 0, 1).getDay() + 1) / 7)).padStart(2, '0')}`;
      }
      if (period === 'quarterly') return `${y}-Q${Math.ceil(monthNum / 3)}`;
      if (period === 'half-yearly') return `${y}-H${monthNum <= 6 ? 1 : 2}`;
      if (period === 'yearly') return `${y}`;
      return `${y}-${m}`;
    }

    const groups: Record<
      string,
      {
        revenue: number;
        platformEarnings: number;
        companyAmount: number;
        count: number;
        companies: Record<
          string,
          {
            name: string;
            revenue: number;
            platformEarnings: number;
            companyAmount: number;
            count: number;
          }
        >;
      }
    > = {};

    payments.forEach((p: FullPaymentBooking) => {
      const key = getKey(new Date(p.createdAt));
      if (!groups[key])
        groups[key] = {
          revenue: 0,
          platformEarnings: 0,
          companyAmount: 0,
          count: 0,
          companies: {},
        };
      const totalRev = Number(p.totalAmount ?? 0);
      const platEarn = Number(p.platformFeeAmount ?? 0);
      const compAmt = Number(p.companyAmount ?? 0);
      groups[key].revenue += totalRev;
      groups[key].platformEarnings += platEarn;
      groups[key].companyAmount += compAmt;
      groups[key].count += 1;

      const company = p.Booking?.Trip?.Bus?.Company;
      const cId = company?.id ?? 'unknown';
      if (!groups[key].companies[cId])
        groups[key].companies[cId] = {
          name: company?.name ?? 'غير معروفة',
          revenue: 0,
          platformEarnings: 0,
          companyAmount: 0,
          count: 0,
        };
      groups[key].companies[cId].revenue += totalRev;
      groups[key].companies[cId].platformEarnings += platEarn;
      groups[key].companies[cId].companyAmount += compAmt;
      groups[key].companies[cId].count += 1;
    });

    type EarningsEntry = {
      revenue: number;
      platformEarnings: number;
      companyAmount: number;
      count: number;
      companies: Record<
        string,
        {
          name: string;
          revenue: number;
          platformEarnings: number;
          companyAmount: number;
          count: number;
        }
      >;
    };
    type EarningsCompany = {
      name: string;
      revenue: number;
      platformEarnings: number;
      companyAmount: number;
      count: number;
    };
    return Object.entries(groups)
      .map(([period, g]: [string, EarningsEntry]) => ({
        period,
        revenue: Math.round(g.revenue * 100) / 100,
        platformEarnings: Math.round(g.platformEarnings * 100) / 100,
        companyAmount: Math.round(g.companyAmount * 100) / 100,
        count: g.count,
        companies: Object.values(g.companies).map((c: EarningsCompany) => ({
          ...c,
          revenue: Math.round(c.revenue * 100) / 100,
          platformEarnings: Math.round(c.platformEarnings * 100) / 100,
          companyAmount: Math.round(c.companyAmount * 100) / 100,
        })),
      }))
      .sort(
        (
          a: {
            period: string;
            revenue: number;
            platformEarnings: number;
            companyAmount: number;
            count: number;
            companies: {
              name: string;
              revenue: number;
              platformEarnings: number;
              companyAmount: number;
              count: number;
            }[];
          },
          b: {
            period: string;
            revenue: number;
            platformEarnings: number;
            companyAmount: number;
            count: number;
            companies: {
              name: string;
              revenue: number;
              platformEarnings: number;
              companyAmount: number;
              count: number;
            }[];
          },
        ) => a.period.localeCompare(b.period),
      );
  }

  async getPerformance(period: Period = 'monthly') {
    const [payments, allExpenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        include: {
          Booking: {
            include: {
              Trip: {
                include: {
                  Bus: {
                    include: { Company: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.expense.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    function getKey(d: Date): string {
      const y = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const m = String(monthNum).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (period === 'daily') return `${y}-${m}-${day}`;
      if (period === 'weekly') {
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        return `${y}-W${String(Math.ceil(((+d - +new Date(y, 0, 1)) / 86400000 + new Date(y, 0, 1).getDay() + 1) / 7)).padStart(2, '0')}`;
      }
      if (period === 'quarterly') return `${y}-Q${Math.ceil(monthNum / 3)}`;
      if (period === 'half-yearly') return `${y}-H${monthNum <= 6 ? 1 : 2}`;
      if (period === 'yearly') return `${y}`;
      return `${y}-${m}`;
    }

    const groups: Record<
      string,
      {
        platformRevenue: number;
        platformExpenses: number;
        count: number;
        companies: Record<
          string,
          {
            id: string;
            name: string;
            revenue: number;
            platformFees: number;
            companyIncome: number;
            count: number;
          }
        >;
      }
    > = {};

    payments.forEach((p: FullPaymentBooking) => {
      const key = getKey(new Date(p.createdAt));
      if (!groups[key])
        groups[key] = {
          platformRevenue: 0,
          platformExpenses: 0,
          count: 0,
          companies: {},
        };
      const totalRev = Number(p.totalAmount ?? 0);
      const platRev = Number(p.platformFeeAmount ?? 0);
      const compInc = Number(p.companyAmount ?? 0);
      groups[key].platformRevenue += platRev;
      groups[key].count += 1;

      const company = p.Booking?.Trip?.Bus?.Company;
      const cId = company?.id ?? 'unknown';
      if (!groups[key].companies[cId])
        groups[key].companies[cId] = {
          id: cId,
          name: company?.name ?? 'غير معروفة',
          revenue: 0,
          platformFees: 0,
          companyIncome: 0,
          count: 0,
        };
      groups[key].companies[cId].revenue += totalRev;
      groups[key].companies[cId].platformFees += platRev;
      groups[key].companies[cId].companyIncome += compInc;
      groups[key].companies[cId].count += 1;
    });

    allExpenses.forEach(
      (e: {
        id: string;
        amount: Prisma.Decimal;
        reason: string;
        createdAt: Date;
        updatedAt: Date;
      }) => {
        const key = getKey(new Date(e.createdAt));
        if (!groups[key])
          groups[key] = {
            platformRevenue: 0,
            platformExpenses: 0,
            count: 0,
            companies: {},
          };
        groups[key].platformExpenses += Number(e.amount ?? 0);
      },
    );

    type PerfEntry = {
      platformRevenue: number;
      platformExpenses: number;
      count: number;
      companies: Record<
        string,
        {
          id: string;
          name: string;
          revenue: number;
          platformFees: number;
          companyIncome: number;
          count: number;
        }
      >;
    };
    type PerfCompany = {
      id: string;
      name: string;
      revenue: number;
      platformFees: number;
      companyIncome: number;
      count: number;
    };
    return Object.entries(groups)
      .map(([period, g]: [string, PerfEntry]) => ({
        period,
        platformRevenue: Math.round(g.platformRevenue * 100) / 100,
        platformExpenses: Math.round(g.platformExpenses * 100) / 100,
        platformNet:
          Math.round((g.platformRevenue - g.platformExpenses) * 100) / 100,
        count: g.count,
        companies: Object.values(g.companies).map((c: PerfCompany) => ({
          ...c,
          revenue: Math.round(c.revenue * 100) / 100,
          platformFees: Math.round(c.platformFees * 100) / 100,
          companyIncome: Math.round(c.companyIncome * 100) / 100,
        })),
      }))
      .sort(
        (
          a: {
            period: string;
            platformRevenue: number;
            platformExpenses: number;
            platformNet: number;
            count: number;
            companies: {
              id: string;
              name: string;
              revenue: number;
              platformFees: number;
              companyIncome: number;
              count: number;
            }[];
          },
          b: {
            period: string;
            platformRevenue: number;
            platformExpenses: number;
            platformNet: number;
            count: number;
            companies: {
              id: string;
              name: string;
              revenue: number;
              platformFees: number;
              companyIncome: number;
              count: number;
            }[];
          },
        ) => a.period.localeCompare(b.period),
      );
  }

  private normalizePassengerData(passenger: any): any[] {
    if (!Array.isArray(passenger)) {
      return [];
    }
    return passenger.map((pp: any) => {
      if (!pp || typeof pp !== 'object') {
        return { name: '', age: 0, gender: '' };
      }
      return {
        name: pp.name ?? pp.passengerName ?? '',
        age: pp.age ?? pp.passengerAge ?? 0,
        gender: pp.gender ?? pp.passengerGender ?? '',
      };
    });
  }
}
