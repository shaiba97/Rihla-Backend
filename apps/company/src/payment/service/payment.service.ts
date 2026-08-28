import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getFinancialSummary(companyId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        Booking: { Trip: { Bus: { companyId } } },
        status: 'SUCCESS',
      },
      include: { Booking: { include: { Trip: true } } },
    });

    const totalRevenue = payments.reduce((s: number, p: any) => s + Number(p.companyAmount ?? 0), 0);

    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const thisMonthPayments = payments.filter((p: any) => new Date(p.createdAt) >= startOfMonth);
    const thisMonthRevenue = thisMonthPayments.reduce((s: number, p: any) => s + Number(p.companyAmount ?? 0), 0);

    const totalBookings = await this.prisma.booking.count({ where: { Trip: { Bus: { companyId } }, status: 'CONFIRMED' } });
    const pendingBookings = await this.prisma.booking.count({ where: { Trip: { Bus: { companyId } }, status: 'PENDING' } });

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPayments = payments.filter((p: any) => new Date(p.createdAt) >= thirtyDaysAgo);
    const dailyMap: Record<string, number> = {};
    recentPayments.forEach((p: any) => {
      const date = new Date(p.createdAt).toISOString().split('T')[0];
      dailyMap[date] = (dailyMap[date] ?? 0) + Number(p.companyAmount ?? 0);
    });
    const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })).sort((a: any, b: any) => a.date.localeCompare(b.date));

    const tripMap: Record<string, { tripId: string; from: string; to: string; revenue: number; bookings: number }> = {};
    payments.forEach((p: any) => {
      const trip = p.Booking?.Trip; if (!trip) return;
      if (!tripMap[trip.id]) tripMap[trip.id] = { tripId: trip.id, from: trip.fromCity ?? '', to: trip.toCity ?? '', revenue: 0, bookings: 0 };
      tripMap[trip.id].revenue += Number(p.companyAmount ?? 0);
      tripMap[trip.id].bookings += 1;
    });
    const topTrips = Object.values(tripMap).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);

    const recentPaymentsList = payments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map((p: any) => ({
      id: p.id, bookingId: p.bookingId, totalAmount: Number(p.totalAmount),
      companyAmount: Number(p.companyAmount), commissionAmount: Number(p.commissionAmount),
      paymentMethod: p.paymentMethod, createdAt: p.createdAt,
      from: p.Booking?.Trip?.fromCity, to: p.Booking?.Trip?.toCity,
    }));

    const totalCompanyIncome = payments.reduce((s: number, p: any) => s + Number(p.companyAmount ?? 0), 0);
    return { totalRevenue, totalCommission: 0, netEarnings: totalCompanyIncome, thisMonthRevenue, totalBookings, pendingBookings, dailyRevenue, topTrips, recentPayments: recentPaymentsList };
  }

  async getBusProfits(companyId: string) {
    const activeFee = await this.prisma.platformFee.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    const feeRate = activeFee ? Number(activeFee.percentage) : 5;

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED' as any,
        Trip: { Bus: { companyId } },
      },
      include: { Trip: { include: { Bus: { select: { id: true, name: true } } } } },
    });

    const profitByBus: Record<string, { busId: string; busName: string; profit: number }> = {};
    for (const b of bookings as any[]) {
      const bus = b.Trip?.Bus;
      if (!bus?.id) continue;
      if (!profitByBus[bus.id]) profitByBus[bus.id] = { busId: bus.id, busName: bus.name ?? '—', profit: 0 };
      const price = Number(b.Trip?.price ?? 0);
      const seats = Array.isArray(b.seatNumbers) ? b.seatNumbers.length : 0;
      if (price <= 0 || seats <= 0) continue;
      const gross = price * seats;
      const commission = Math.round((gross * feeRate) / 100);
      profitByBus[bus.id].profit += gross - commission;
    }

    const buses = await this.prisma.bus.findMany({
      where: { companyId },
      select: { id: true, name: true },
    });
    for (const b of buses as any[]) {
      if (!profitByBus[b.id]) profitByBus[b.id] = { busId: b.id, busName: b.name ?? '—', profit: 0 };
    }

    return Object.values(profitByBus)
      .map((v) => ({ ...v, profit: Math.round(v.profit) }))
      .sort((a, b) => b.profit - a.profit);
  }

  async getPerformance(companyId: string, period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' = 'monthly') {
    const payments = await this.prisma.payment.findMany({
      where: {
        Booking: { Trip: { Bus: { companyId } } },
        status: 'SUCCESS',
      },
      orderBy: { createdAt: 'asc' },
    });

    function getKey(d: Date): string {
      const y = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const m = String(monthNum).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (period === 'daily') return `${y}-${m}-${day}`;
      if (period === 'weekly') return `${y}-W${String(Math.ceil(((+d - +new Date(y,0,1))/86400000 + new Date(y,0,1).getDay() + 1) / 7)).padStart(2,'0')}`;
      if (period === 'quarterly') return `${y}-Q${Math.ceil(monthNum / 3)}`;
      if (period === 'half-yearly') return `${y}-H${monthNum <= 6 ? 1 : 2}`;
      if (period === 'yearly') return `${y}`;
      return `${y}-${m}`;
    }

    const groups: Record<string, { revenue: number; platformFees: number; netIncome: number; count: number }> = {};

    payments.forEach((p: any) => {
      const key = getKey(new Date(p.createdAt));
      if (!groups[key]) groups[key] = { revenue: 0, platformFees: 0, netIncome: 0, count: 0 };
      groups[key].revenue += Number(p.totalAmount ?? 0);
      groups[key].netIncome += Number(p.companyAmount ?? 0);
      groups[key].count += 1;
    });

    return Object.entries(groups).map(([period, g]) => ({
      period,
      revenue: Math.round(g.revenue),
      platformFees: Math.round(g.platformFees),
      netIncome: Math.round(g.netIncome),
      count: g.count,
    })).sort((a, b) => a.period.localeCompare(b.period));
  }
}
