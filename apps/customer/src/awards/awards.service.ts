import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class AwardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyAwards(userId: string) {
    const awards = await this.prisma.userAward.findMany({
      where: { userId },
      include: { Pack: true },
      orderBy: { createdAt: 'desc' },
    });
    return awards.map(a => ({ id: a.id, status: a.status, pack: a.Pack, createdAt: a.createdAt }));
  }

  async getPacks(userId?: string) {
    const packs = await this.prisma.awardPack.findMany({
      where: { isActive: true },
      orderBy: [{ awardValue: 'desc' }, { createdAt: 'desc' }],
    });
    if (!userId) return packs;

    const totalBookings = await this.prisma.booking.count({
      where: { customerId: userId, status: 'CONFIRMED', Payment: { status: 'SUCCESS' } },
    });
    const userAwards = await this.prisma.userAward.findMany({
      where: { userId },
      select: { packId: true, status: true },
    });
    const approvedSet = new Set(userAwards.filter(a => a.status === 'APPROVED').map(a => a.packId));
    const pendingSet = new Set(userAwards.filter(a => a.status === 'PENDING').map(a => a.packId));

    return packs.map(p => ({
      ...p,
      userTotalBookings: totalBookings,
      eligible: totalBookings >= p.minBookings,
      earned: approvedSet.has(p.id),
      pending: pendingSet.has(p.id),
    }));
  }

  async requestAward(userId: string, packId: string) {
    const pack = await this.prisma.awardPack.findUnique({ where: { id: packId } });
    if (!pack) throw new NotFoundException('المكافأة غير موجودة');

    const totalBookings = await this.prisma.booking.count({
      where: { customerId: userId, status: 'CONFIRMED', Payment: { status: 'SUCCESS' } },
    });
    if (totalBookings < pack.minBookings) {
      throw new BadRequestException('لم تصل إلى الحد الأدنى من الحجوزات');
    }

    const existing = await this.prisma.userAward.findUnique({
      where: { userId_packId: { userId, packId } },
    });
    if (existing) throw new BadRequestException('تم تقديم طلب لهذه المكافأة مسبقاً');

    return this.prisma.userAward.create({ data: { userId, packId } });
  }

  async getPackDetail(userId: string, packId: string) {
    const pack = await this.prisma.awardPack.findUnique({ where: { id: packId } });
    if (!pack) throw new NotFoundException('المكافأة غير موجودة');

    const awards = await this.prisma.userAward.findMany({
      where: { userId, packId },
      orderBy: { createdAt: 'desc' },
    });

    const totalBookings = await this.prisma.booking.count({
      where: { customerId: userId, status: 'CONFIRMED', Payment: { status: 'SUCCESS' } },
    });

    return { pack, awards, totalBookings };
  }
}
