import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class AwardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-earn: for every active pack whose booking threshold the user has
   * met, upsert an APPROVED UserAward row if one doesn't exist yet.
   * Idempotent via the @@unique([userId, packId]) constraint.
   */
  private async ensureEarned(userId: string) {
    const totalBookings = await this.prisma.booking.count({
      where: {
        customerId: userId,
        status: 'CONFIRMED',
        Payment: { status: 'SUCCESS' },
      },
    });
    const packs = await this.prisma.awardPack.findMany({
      where: { isActive: true },
    });
    for (const p of packs) {
      if (totalBookings >= p.minBookings) {
        await this.prisma.userAward.upsert({
          where: { userId_packId: { userId, packId: p.id } },
          create: { userId, packId: p.id, status: 'APPROVED' },
          update: {},
        });
      }
    }
  }

  async getMyAwards(userId: string) {
    const awards = await this.prisma.userAward.findMany({
      where: { userId },
      include: { Pack: true },
      orderBy: { createdAt: 'desc' },
    });
    return awards.map((a) => ({
      id: a.id,
      status: a.status,
      pack: a.Pack,
      createdAt: a.createdAt,
    }));
  }

  async getPacks(userId?: string) {
    const packs = await this.prisma.awardPack.findMany({
      where: { isActive: true },
      orderBy: [{ awardValue: 'desc' }, { createdAt: 'desc' }],
    });
    if (!userId) return packs;

    const totalBookings = await this.prisma.booking.count({
      where: {
        customerId: userId,
        status: 'CONFIRMED',
        Payment: { status: 'SUCCESS' },
      },
    });
    const userAwards = await this.prisma.userAward.findMany({
      where: { userId },
      select: { packId: true, status: true },
    });
    const approvedSet = new Set(
      userAwards.filter((a) => a.status === 'APPROVED').map((a) => a.packId),
    );
    const pendingSet = new Set(
      userAwards.filter((a) => a.status === 'PENDING').map((a) => a.packId),
    );

    return packs.map((p) => ({
      ...p,
      userTotalBookings: totalBookings,
      eligible: totalBookings >= p.minBookings,
      earned: approvedSet.has(p.id),
      pending: pendingSet.has(p.id),
    }));
  }

  async requestAward(userId: string, packId: string) {
    const pack = await this.prisma.awardPack.findUnique({
      where: { id: packId },
    });
    if (!pack) throw new NotFoundException('المكافأة غير موجودة');

    const totalBookings = await this.prisma.booking.count({
      where: {
        customerId: userId,
        status: 'CONFIRMED',
        Payment: { status: 'SUCCESS' },
      },
    });
    if (totalBookings < pack.minBookings) {
      throw new BadRequestException('لم تصل إلى الحد الأدنى من الحجوزات');
    }

    const existing = await this.prisma.userAward.findUnique({
      where: { userId_packId: { userId, packId } },
    });
    if (existing)
      throw new BadRequestException('تم تقديم طلب لهذه المكافأة مسبقاً');

    return this.prisma.userAward.create({ data: { userId, packId } });
  }

  async getPackDetail(userId: string, packId: string) {
    const pack = await this.prisma.awardPack.findUnique({
      where: { id: packId },
    });
    if (!pack) throw new NotFoundException('المكافأة غير موجودة');

    const awards = await this.prisma.userAward.findMany({
      where: { userId, packId },
      orderBy: { createdAt: 'desc' },
    });

    const totalBookings = await this.prisma.booking.count({
      where: {
        customerId: userId,
        status: 'CONFIRMED',
        Payment: { status: 'SUCCESS' },
      },
    });

    return { pack, awards, totalBookings };
  }

  async getTotalEarnings(userId: string) {
    await this.ensureEarned(userId);
    const approved = await this.prisma.userAward.findMany({
      where: { userId, status: 'APPROVED' },
      include: { Pack: true },
    });
    const total = approved.reduce(
      (sum, a) => sum + Number(a.Pack.awardValue),
      0,
    );
    const withdrawn = await this.prisma.withdrawRequest.aggregate({
      where: { userId, status: 'APPROVED' },
      _sum: { amount: true },
    });
    const pendingWithdrawals = await this.prisma.withdrawRequest.aggregate({
      where: { userId, status: 'PENDING' },
      _sum: { amount: true },
    });
    const withdrawnTotal = Number(withdrawn._sum.amount ?? 0);
    const pendingTotal = Number(pendingWithdrawals._sum.amount ?? 0);
    return {
      totalEarnings: total,
      withdrawn: withdrawnTotal,
      pendingWithdrawals: pendingTotal,
      available: total - withdrawnTotal - pendingTotal,
    };
  }

  async createWithdrawRequest(
    userId: string,
    data: { bankName: string; accountHolder: string; accountNumber: string; amount: number },
  ) {
    // The balance read, pending-check and insert run inside one transaction
    // serialized by a per-user advisory lock, so two concurrent requests can
    // never both withdraw the full balance (double-spend race).
    return this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text`;

      await this.ensureEarned(userId);

      const approved = await tx.userAward.findMany({
        where: { userId, status: 'APPROVED' },
        include: { Pack: true },
      });
      const total = approved.reduce(
        (sum: number, a: any) => sum + Number(a.Pack.awardValue),
        0,
      );
      const withdrawnAgg = await tx.withdrawRequest.aggregate({
        where: { userId, status: 'APPROVED' },
        _sum: { amount: true },
      });
      const pendingAgg = await tx.withdrawRequest.aggregate({
        where: { userId, status: 'PENDING' },
        _sum: { amount: true },
      });
      const available = total - Number(withdrawnAgg._sum.amount ?? 0) - Number(pendingAgg._sum.amount ?? 0);

      if (available <= 0) {
        throw new BadRequestException('لا يوجد رصيد متاح للسحب');
      }

      // Minimum withdrawal = minimum pack value
      const minPackValue = approved.length > 0
        ? Math.min(...approved.map((a: any) => Number(a.Pack.awardValue)))
        : 0;
      if (data.amount < minPackValue) {
        throw new BadRequestException(`الحد الأدنى للسحب هو ${minPackValue} جنيه`);
      }
      if (data.amount > available) {
        throw new BadRequestException(`المبلغ المطلوب يتجاوز الرصيد المتاح (${available} جنيه)`);
      }

      const pending = await tx.withdrawRequest.findFirst({
        where: { userId, status: 'PENDING' },
      });
      if (pending) {
        throw new BadRequestException('لديك طلب سحب معلق بالفعل');
      }

      return tx.withdrawRequest.create({
        data: {
          userId,
          bankName: data.bankName,
          accountHolder: data.accountHolder,
          accountNumber: data.accountNumber,
          amount: data.amount,
        },
      });
    });
  }

  async getWithdrawals(userId: string) {
    return this.prisma.withdrawRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
