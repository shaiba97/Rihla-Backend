import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: TafiyaWsGateway,
  ) {}
  async getStats() {
    const [total, customers, companies] = await Promise.all([
      this.prisma.users.count(),
      this.prisma.users.count({ where: { role: 'CUSTOMER' as any } }),
      this.prisma.users.count({ where: { role: 'COMPANY' as any } }),
    ]);
    return { total, customers, companies };
  }
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (params.search)
      where.OR = [
        { name: { contains: params.search } },
        { phone: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    if (params.role) where.role = params.role;
    const [raw, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          Booking: { select: { id: true } },
          Bus: { select: { id: true } },
        },
      }),
      this.prisma.users.count({ where }),
    ]);
    const userIds = raw.map((u: any) => u.id);
    let users: any[] = raw.map((u: any) => ({
      ...u,
      _count: { Booking: u.Booking?.length ?? 0, Bus: u.Bus?.length ?? 0 },
    }));

    const userAwards = await this.prisma.userAward.findMany({
      where: { userId: { in: userIds }, status: 'APPROVED' },
      select: {
        userId: true,
        Pack: { select: { awardValue: true } },
      },
    });
    const awardsMap = new Map<string, number>();
    for (const a of userAwards) {
      const val = Number(a.Pack?.awardValue ?? 0);
      awardsMap.set(a.userId, (awardsMap.get(a.userId) ?? 0) + val);
    }
    users = users.map((u: any) => ({ ...u, awards: awardsMap.get(u.id) ?? 0 }));

    if (params.role === 'COMPANY') {
      const payments = await this.prisma.payment.findMany({
        where: {
          status: 'SUCCESS',
          Booking: {
            status: 'CONFIRMED',
            Trip: { Bus: { companyId: { in: userIds } } },
          },
        },
        select: {
          companyAmount: true,
          Booking: {
            select: {
              Trip: { select: { Bus: { select: { companyId: true } } } },
            },
          },
        },
      });
      const profitsMap = new Map<string, number>();
      for (const p of payments) {
        const cid = (p as any).Booking.Trip.Bus.companyId;
        const amount = Number(p.companyAmount ?? 0);
        profitsMap.set(cid, (profitsMap.get(cid) ?? 0) + amount);
      }
      users = users.map((u: any) => ({
        ...u,
        profits: profitsMap.get(u.id) ?? 0,
      }));
    } else {
      users = users.map((u: any) => ({ ...u, profits: null }));
    }
    return { users, total, page, pages: Math.ceil(total / limit) };
  }
  async findOne(id: string) {
    const raw = (await this.prisma.users.findUnique({
      where: { id },
      include: {
        Booking: {
          include: { Trip: true, Payment: true, TicketPDF: true },
          orderBy: { createdAt: 'desc' },
        },
        Bus: { include: { Trip: { include: { Bus: true } } } },
        CompanyBankAccount: true,
      },
    })) as any;
    if (!raw) throw new NotFoundException('المستخدم غير موجود');
    const confirmedBookings = raw.Booking.filter(
      (b: any) => b.status === 'CONFIRMED',
    );

    let totalProfits = 0;
    let totalPaidOut = 0;
    const tripProfitsMap = new Map<
      string,
      { profit: number; platformFee: number }
    >();

    const allTripIds = (raw.Bus ?? []).flatMap((bus: any) =>
      (bus.Trip ?? []).map((t: any) => t.id),
    );
    if (allTripIds.length > 0) {
      const bookings = await this.prisma.booking.findMany({
        where: { tripId: { in: allTripIds }, status: 'CONFIRMED' },
        include: { Payment: true },
      });
      for (const b of bookings) {
        const p = b.Payment;
        if (p?.status === 'SUCCESS') {
          const profit = Number(p.companyAmount ?? 0);
          const fee = Number(p.platformFeeAmount ?? 0);
          totalProfits += profit;
          const tid = b.tripId;
          const existing = tripProfitsMap.get(tid) ?? {
            profit: 0,
            platformFee: 0,
          };
          existing.profit += profit;
          existing.platformFee += fee;
          tripProfitsMap.set(tid, existing);
        }
      }

      try {
        const payouts = await this.prisma.payoutRecord.findMany({
          where: { companyId: id },
        });
        totalPaidOut = payouts.reduce(
          (s: number, p: any) => s + Number(p.amount),
          0,
        );
      } catch {}
    }

    const buses = (raw.Bus ?? []).map((bus: any) => ({
      ...bus,
      Trip: (bus.Trip ?? []).map((t: any) => ({
        ...t,
        _profit: tripProfitsMap.get(t.id)?.profit ?? 0,
        _platformFee: tripProfitsMap.get(t.id)?.platformFee ?? 0,
      })),
    }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...safe } = raw;
    return {
      ...safe,
      Bus: buses,
      _confirmedBookings: confirmedBookings.length,
      _totalProfits: totalProfits,
      _totalPaidOut: totalPaidOut,
      _remainingProfits: totalProfits - totalPaidOut,
    };
  }
  async toggleActive(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('غير موجود');
    const updated = await this.prisma.users.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });
    this.wsGateway.emitToAdmin(WS_EVENTS.USER_TOGGLED, updated);
    return updated;
  }
  async remove(id: string) {
    await this.findOne(id);
    const result = await this.prisma.users.delete({ where: { id } });
    this.wsGateway.emitToAdmin(WS_EVENTS.USER_DELETED, { id });
    return result;
  }
}
