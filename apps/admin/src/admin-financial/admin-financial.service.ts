import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { PDFService } from '@app/pdf';
import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';
import { NotificationsService } from '../notifications/notifications.service';

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

@Injectable()
export class AdminFinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PDFService,
    private readonly wsGateway: RihlaWsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async getDashboardSummary() {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const last30 = new Date(now); last30.setDate(last30.getDate() - 30);
    const last7 = new Date(now); last7.setDate(last7.getDate() - 7);

    const [
      totalUsers, totalCompanies, totalCustomers, newUsersToday, newUsersThisMonth,
      totalBookings, confirmedBookings, pendingBookings, cancelledBookings, bookingsToday, bookingsThisMonth,
      totalTrips, scheduledTrips, totalBuses,
      allPayments, pendingPaymentsCount,
      activeFee, totalPaymentAccounts, activePaymentAccounts,
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
      this.prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { status: 'SCHEDULED' as any } }),
      this.prisma.bus.count(),
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS' as any },
        select: { totalAmount: true, platformFeeAmount: true, companyAmount: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { status: 'PENDING' as any } }),
      this.prisma.platformFee.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.paymentAccount.count(),
      this.prisma.paymentAccount.count({ where: { isActive: true } }),
    ]);

    const totalRevenue = allPayments.reduce((s, p) => s + Number(p.totalAmount), 0);
    const totalPlatformEarnings = allPayments.reduce((s, p) => s + Number(p.platformFeeAmount ?? 0), 0);
    const totalCompanyAmount = allPayments.reduce((s, p) => s + Number(p.companyAmount ?? 0), 0);
    const revenueThisMonth = allPayments.filter(p => new Date(p.createdAt) >= startOfMonth).reduce((s, p) => s + Number(p.totalAmount), 0);

    const dailyRevenueMap: Record<string, { revenue: number; earnings: number; bookings: number }> = {};
    for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); dailyRevenueMap[d.toISOString().slice(0, 10)] = { revenue: 0, earnings: 0, bookings: 0 }; }
    allPayments.filter(p => new Date(p.createdAt) >= last30).forEach(p => { const key = new Date(p.createdAt).toISOString().slice(0, 10); if (dailyRevenueMap[key]) { dailyRevenueMap[key].revenue += Number(p.totalAmount); dailyRevenueMap[key].earnings += Number(p.platformFeeAmount ?? 0); dailyRevenueMap[key].bookings += 1; } });
    const dailyRevenue = Object.entries(dailyRevenueMap).map(([date, data]) => ({ date, ...data }));

    const methodMap: Record<string, number> = {};
    allPayments.forEach(p => { const m = p.paymentMethod ?? 'other'; methodMap[m] = (methodMap[m] ?? 0) + Number(p.totalAmount); });
    const paymentMethodBreakdown = Object.entries(methodMap).map(([method, amount]) => ({ method, amount }));

    const [recentBookings, recentPendingPayments] = await Promise.all([
      this.prisma.booking.findMany({
        take: 8, orderBy: { createdAt: 'desc' },
        include: {
          Trip: { select: { fromCity: true, toCity: true, departureDate: true } },
          Customer: { select: { name: true, phone: true } },
          Payment: { select: { status: true, totalAmount: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { status: 'PENDING' as any },
        take: 5, orderBy: { createdAt: 'desc' },
        include: { Booking: { include: { Trip: { select: { fromCity: true, toCity: true } }, Customer: { select: { name: true } } } } },
      }),
    ]);

    return {
      platform: { activePlatformFee: activeFee ? { id: activeFee.id, amount: Number(activeFee.amount), currency: activeFee.currency, label: activeFee.description ?? null, isActive: activeFee.isActive } : null, pendingPaymentsRequiringAction: pendingPaymentsCount, totalPaymentAccounts, activePaymentAccounts },
      users: { total: totalUsers, customers: totalCustomers, companies: totalCompanies, newToday: newUsersToday, newThisMonth: newUsersThisMonth },
      bookings: { total: totalBookings, confirmed: confirmedBookings, pending: pendingBookings, cancelled: cancelledBookings, today: bookingsToday, thisMonth: bookingsThisMonth, confirmationRate: totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0 },
      operations: { totalTrips, activeTrips: scheduledTrips, totalBuses },
      revenue: { totalRevenue: Math.round(totalRevenue), totalPlatformEarnings: Math.round(totalPlatformEarnings), totalCompanyAmount: Math.round(totalCompanyAmount), revenueThisMonth: Math.round(revenueThisMonth), totalSuccessfulTransactions: allPayments.length, dailyRevenue, paymentMethodBreakdown: paymentMethodBreakdown.map(m => ({ ...m, amount: Math.round(m.amount) })) },
      recentBookings: recentBookings.map(b => ({ id: b.id, customerName: b.Customer?.name ?? '—', from: b.Trip?.fromCity ?? '—', to: b.Trip?.toCity ?? '—', date: b.Trip?.departureDate, seatNumber: b.seatNumbers?.[0] ?? 0, status: b.status, paymentStatus: b.Payment?.status, amount: Number(b.Payment?.totalAmount ?? 0), createdAt: b.createdAt })),
      pendingActions: recentPendingPayments.map(p => ({ id: p.id, customerName: p.Booking?.Customer?.name ?? '—', from: p.Booking?.Trip?.fromCity ?? '—', to: p.Booking?.Trip?.toCity ?? '—', amount: Number(p.totalAmount), paymentMethod: p.paymentMethod, createdAt: p.createdAt })),
    };
  }

  async getOverview() {
    const [allPayments, pendingPayments, confirmedPayments, bookingStats, activeFee, totalExpenses] = await Promise.all([
      this.prisma.payment.findMany({
        include: {
          Booking: { include: { Trip: { include: { Bus: { include: { Company: { select: { id: true, name: true } } } } } }, Customer: { select: { id: true, name: true, phone: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'SUCCESS' } }),
      this.prisma.booking.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.platformFee.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);

    const successPayments = allPayments.filter(p => p.status === 'SUCCESS');
    const totalRevenue = successPayments.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0);
    const totalCompanyAmount = successPayments.reduce((s, p) => s + Number(p.companyAmount ?? 0), 0);
    const totalPlatformEarnings = successPayments.reduce((s, p) => s + Number(p.platformFeeAmount ?? 0), 0);

    const monthlyMap: Record<string, { revenue: number; earnings: number; count: number }> = {};
    successPayments.forEach(p => {
      const key = new Date(p.createdAt).toISOString().slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, earnings: 0, count: 0 };
      monthlyMap[key].revenue += Number(p.totalAmount ?? 0);
      monthlyMap[key].earnings += Number(p.platformFeeAmount ?? 0);
      monthlyMap[key].count += 1;
    });
    const monthlyBreakdown = Object.entries(monthlyMap).map(([month, d]) => ({ month, ...d })).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

    const bm: Record<string, number> = {};
    bookingStats.forEach((b: any) => { bm[b.status] = b._count.id; });

    const totalExpensesVal = Number(totalExpenses._sum.amount ?? 0);

    return {
      totalRevenue, totalCompanyAmount,
      totalPlatformEarnings,
      totalExpenses: totalExpensesVal,
      netRevenue: totalPlatformEarnings - totalExpensesVal,
      totalTransactions: successPayments.length, pendingPayments, confirmedPayments,
      activeFee: activeFee ? { id: activeFee.id, amount: Number(activeFee.amount), currency: activeFee.currency, label: activeFee.description ?? null, isActive: activeFee.isActive, createdAt: activeFee.createdAt } : null,
      monthlyBreakdown,
      bookingStatus: { pending: bm['PENDING'] ?? 0, confirmed: bm['CONFIRMED'] ?? 0, cancelled: bm['CANCELLED'] ?? 0 },
      allTransactions: allPayments.length,
      recentPayments: allPayments.map(p => ({
        id: p.id, status: p.status, totalAmount: Number(p.totalAmount),
        platformFeeAmount: Number(p.platformFeeAmount ?? 0), companyAmount: Number(p.companyAmount ?? 0),
        paymentMethod: p.paymentMethod, transactionId: p.transactionId, recieptFile: p.receiptFile,
        createdAt: p.createdAt, bookingId: p.bookingId,
        bookingStatus: p.Booking?.status,
        seatNumbers: p.Booking?.seatNumbers,
        customer: { name: p.Booking?.Customer?.name, phone: p.Booking?.Customer?.phone },
        trip: { from: p.Booking?.Trip?.fromCity, to: p.Booking?.Trip?.toCity, date: p.Booking?.Trip?.departureDate, time: p.Booking?.Trip?.departureTime, bus: p.Booking?.Trip?.Bus ? { name: p.Booking.Trip.Bus.name, company: { name: p.Booking.Trip.Bus.Company?.name ?? '' } } : null },
      })),
    };
  }

  async getPendingPayments() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: { Booking: { include: { Trip: true, Customer: { select: { id: true, name: true, phone: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map(p => ({
      id: p.id, status: p.status, totalAmount: Number(p.totalAmount),
      platformFeeAmount: Number(p.platformFeeAmount ?? 0), companyAmount: Number(p.companyAmount ?? 0),
      paymentMethod: p.paymentMethod, transactionId: p.transactionId, recieptFile: p.receiptFile,
      createdAt: p.createdAt, bookingId: p.bookingId,
      seatNumbers: p.Booking?.seatNumbers,
      customer: { name: p.Booking?.Customer?.name, phone: p.Booking?.Customer?.phone },
      trip: { from: p.Booking?.Trip?.fromCity, to: p.Booking?.Trip?.toCity, date: p.Booking?.Trip?.departureDate, time: p.Booking?.Trip?.departureTime },
    }));
  }

  async confirmPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { Booking: true } });
    if (!payment) throw new NotFoundException('الدفعة غير موجودة');
    if (payment.status === 'SUCCESS') throw new BadRequestException('هذه الدفعة مؤكدة مسبقاً');

    await this.prisma.$transaction(async (tx: any) => {
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'SUCCESS' } });
      await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'CONFIRMED' } });
    });

    this.wsGateway.emitToAdmin(WS_EVENTS.PAYMENT_CONFIRMED, { paymentId, bookingId: payment.bookingId });
    this.wsGateway.emitToRoom('customer:' + payment.Booking?.customerId, WS_EVENTS.PAYMENT_CONFIRMED, { paymentId, bookingId: payment.bookingId });
    this.wsGateway.emitSeatUpdate(payment.Booking?.tripId ?? '', { seatNumbers: payment.Booking?.seatNumbers ?? [], action: 'booked' });
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
    } catch { /* PDF generation not critical */ }

    try {
      const phone = payment.Booking?.passengerContact;
      if (phone) {
        const msg = `✅ تم تأكيد حجزك في رحلة!\n👤 المقعد: ${payment.Booking?.seatNumbers?.join(',')}\n💰 المبلغ: ${payment.totalAmount} جنيه${ticketUrl ? '\n🎫 التذكرة: http://localhost:3003' + ticketUrl : ''}`;
        new Logger('WhatsApp').log('📱 WhatsApp (dev): ' + msg);
      }
    } catch { /* WhatsApp not available */ }

    return { message: 'تم تأكيد الدفعة والحجز بنجاح', ticketUrl };
  }

  async rejectPayment(paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { Booking: true } });
    if (!payment) throw new NotFoundException('الدفعة غير موجودة');
    if (payment.status !== 'PENDING') throw new BadRequestException('يمكن رفض الدفعات المعلقة فقط');

    await this.prisma.$transaction(async (tx: any) => {
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
      await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'CANCELLED', cancellationReason: reason || null } });
    });
    this.wsGateway.emitToAdmin(WS_EVENTS.PAYMENT_REJECTED, { paymentId, bookingId: payment.bookingId });
    this.wsGateway.emitToRoom('customer:' + payment.Booking?.customerId, WS_EVENTS.PAYMENT_REJECTED, { paymentId, bookingId: payment.bookingId });
    this.wsGateway.emitSeatUpdate(payment.Booking?.tripId ?? '', { seatNumbers: payment.Booking?.seatNumbers ?? [], action: 'released' });
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
            Trip: { include: { Bus: { include: { Company: { select: { id: true, name: true } } } } } },
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
        const start = new Date(d); start.setDate(d.getDate() - d.getDay());
        return `${y}-W${String(Math.ceil(((+d - +new Date(y,0,1))/86400000 + new Date(y,0,1).getDay() + 1) / 7)).padStart(2,'0')}`;
      }
      if (period === 'quarterly') return `${y}-Q${Math.ceil(monthNum / 3)}`;
      if (period === 'half-yearly') return `${y}-H${monthNum <= 6 ? 1 : 2}`;
      if (period === 'yearly') return `${y}`;
      return `${y}-${m}`;
    }

    const groups: Record<string, { revenue: number; platformEarnings: number; companyAmount: number; count: number; companies: Record<string, { name: string; revenue: number; platformEarnings: number; companyAmount: number; count: number }> }> = {};

    payments.forEach(p => {
      const key = getKey(new Date(p.createdAt));
      if (!groups[key]) groups[key] = { revenue: 0, platformEarnings: 0, companyAmount: 0, count: 0, companies: {} };
      groups[key].revenue += Number(p.totalAmount ?? 0);
      groups[key].platformEarnings += Number(p.platformFeeAmount ?? 0);
      groups[key].companyAmount += Number(p.companyAmount ?? 0);
      groups[key].count += 1;

      const company = p.Booking?.Trip?.Bus?.Company;
      const cId = company?.id ?? 'unknown';
      if (!groups[key].companies[cId]) groups[key].companies[cId] = { name: company?.name ?? 'غير معروفة', revenue: 0, platformEarnings: 0, companyAmount: 0, count: 0 };
      groups[key].companies[cId].revenue += Number(p.totalAmount ?? 0);
      groups[key].companies[cId].platformEarnings += Number(p.platformFeeAmount ?? 0);
      groups[key].companies[cId].companyAmount += Number(p.companyAmount ?? 0);
      groups[key].companies[cId].count += 1;
    });

    return Object.entries(groups).map(([period, g]) => ({
      period,
      revenue: Math.round(g.revenue),
      platformEarnings: Math.round(g.platformEarnings),
      companyAmount: Math.round(g.companyAmount),
      count: g.count,
      companies: Object.values(g.companies).map(c => ({ ...c, revenue: Math.round(c.revenue), platformEarnings: Math.round(c.platformEarnings), companyAmount: Math.round(c.companyAmount) })),
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  async getPerformance(period: Period = 'monthly') {
    const [payments, allExpenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        include: {
          Booking: {
            include: {
              Trip: { include: { Bus: { include: { Company: { select: { id: true, name: true } } } } } },
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
        const start = new Date(d); start.setDate(d.getDate() - d.getDay());
        return `${y}-W${String(Math.ceil(((+d - +new Date(y,0,1))/86400000 + new Date(y,0,1).getDay() + 1) / 7)).padStart(2,'0')}`;
      }
      if (period === 'quarterly') return `${y}-Q${Math.ceil(monthNum / 3)}`;
      if (period === 'half-yearly') return `${y}-H${monthNum <= 6 ? 1 : 2}`;
      if (period === 'yearly') return `${y}`;
      return `${y}-${m}`;
    }

    const groups: Record<string, {
      platformRevenue: number;
      platformExpenses: number;
      count: number;
      companies: Record<string, { id: string; name: string; revenue: number; platformFees: number; companyIncome: number; count: number }>;
    }> = {};

    payments.forEach(p => {
      const key = getKey(new Date(p.createdAt));
      if (!groups[key]) groups[key] = { platformRevenue: 0, platformExpenses: 0, count: 0, companies: {} };
      groups[key].platformRevenue += Number(p.platformFeeAmount ?? 0);
      groups[key].count += 1;

      const company = p.Booking?.Trip?.Bus?.Company;
      const cId = company?.id ?? 'unknown';
      if (!groups[key].companies[cId]) groups[key].companies[cId] = { id: cId, name: company?.name ?? 'غير معروفة', revenue: 0, platformFees: 0, companyIncome: 0, count: 0 };
      groups[key].companies[cId].revenue += Number(p.totalAmount ?? 0);
      groups[key].companies[cId].platformFees += Number(p.platformFeeAmount ?? 0);
      groups[key].companies[cId].companyIncome += Number(p.companyAmount ?? 0);
      groups[key].companies[cId].count += 1;
    });

    allExpenses.forEach(e => {
      const key = getKey(new Date(e.createdAt));
      if (!groups[key]) groups[key] = { platformRevenue: 0, platformExpenses: 0, count: 0, companies: {} };
      groups[key].platformExpenses += Number(e.amount ?? 0);
    });

    return Object.entries(groups).map(([period, g]) => ({
      period,
      platformRevenue: Math.round(g.platformRevenue),
      platformExpenses: Math.round(g.platformExpenses),
      platformNet: Math.round(g.platformRevenue - g.platformExpenses),
      count: g.count,
      companies: Object.values(g.companies).map(c => ({
        ...c, revenue: Math.round(c.revenue), platformFees: Math.round(c.platformFees), companyIncome: Math.round(c.companyIncome),
      })),
    })).sort((a, b) => a.period.localeCompare(b.period));
  }
}
