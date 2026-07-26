import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'; import { PrismaService, AwardStatus } from '@app/prisma';
@Injectable()
export class AwardService {
  constructor(private readonly prisma: PrismaService) {}
  async getPacks() { return this.prisma.awardPack.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { UserAward: true } } } }); }
  async createPack(data: { title: string; description?: string; icon?: string; minBookings?: number; minTrips?: number; activeDays?: number; consecutiveDays?: number; awardValue: number }) {
    return this.prisma.awardPack.create({ data: { title: data.title, description: data.description, icon: data.icon, minBookings: data.minBookings ?? 0, minTrips: data.minTrips ?? 0, activeDays: data.activeDays ?? 0, consecutiveDays: data.consecutiveDays ?? 0, awardValue: data.awardValue } });
  }
  async updatePack(id: string, data: { title?: string; description?: string; icon?: string; minBookings?: number; minTrips?: number; activeDays?: number; consecutiveDays?: number; awardValue?: number; isActive?: boolean }) {
    await this.findOnePack(id);
    return this.prisma.awardPack.update({ where: { id }, data });
  }
  async removePack(id: string) { await this.findOnePack(id); return this.prisma.awardPack.delete({ where: { id } }); }
  async getPending() {
    return this.prisma.userAward.findMany({
      where: { status: 'PENDING' as AwardStatus },
      include: { Pack: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async approve(id: string) {
    const ua = await this.prisma.userAward.findUnique({ where: { id }, include: { Pack: true } });
    if (!ua) throw new NotFoundException('المكافأة غير موجودة');
    if (ua.status !== 'PENDING') throw new BadRequestException('يمكن قبول المكافآت المعلقة فقط');
    await this.prisma.$transaction(async (tx: any) => {
      await tx.userAward.update({ where: { id }, data: { status: 'APPROVED' } });
      await tx.expense.create({ data: { amount: ua.Pack.awardValue, reason: `مكافأة: ${ua.Pack.title}` } });
    });
    return { message: 'تم قبول المكافأة وتسجيل المصروف' };
  }
  async reject(id: string) {
    const ua = await this.prisma.userAward.findUnique({ where: { id } });
    if (!ua) throw new NotFoundException('المكافأة غير موجودة');
    if (ua.status !== 'PENDING') throw new BadRequestException('يمكن رفض المكافآت المعلقة فقط');
    await this.prisma.userAward.update({ where: { id }, data: { status: 'REJECTED' } });
    return { message: 'تم رفض المكافأة' };
  }
  private async findOnePack(id: string) { const p = await this.prisma.awardPack.findUnique({ where: { id } }); if (!p) throw new NotFoundException('حزمة المكافأة غير موجودة'); return p; }
}
