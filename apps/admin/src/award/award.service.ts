import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService, WithdrawStatus } from '@app/prisma';
@Injectable()
export class AwardService {
  constructor(private readonly prisma: PrismaService) {}
  async getPacks() {
    return this.prisma.awardPack.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { UserAward: true } } },
    });
  }
  async createPack(data: {
    title: string;
    description?: string;
    icon?: string;
    minBookings?: number;
    awardValue: number;
  }) {
    return this.prisma.awardPack.create({
      data: {
        title: data.title,
        description: data.description,
        icon: data.icon,
        minBookings: data.minBookings ?? 0,
        awardValue: data.awardValue,
      },
    });
  }
  async updatePack(
    id: string,
    data: {
      title?: string;
      description?: string;
      icon?: string;
      minBookings?: number;
      awardValue?: number;
      isActive?: boolean;
    },
  ) {
    await this.findOnePack(id);
    return this.prisma.awardPack.update({ where: { id }, data });
  }
  async removePack(id: string) {
    await this.findOnePack(id);
    return this.prisma.awardPack.delete({ where: { id } });
  }
  async getUserAwards(userId: string) {
    const awards = await this.prisma.userAward.findMany({
      where: { userId },
      include: { Pack: true },
      orderBy: { createdAt: 'desc' },
    });
    const totalValue = awards
      .filter((a) => a.status === 'APPROVED')
      .reduce((sum, a) => sum + Number(a.Pack.awardValue), 0);
    let withdrawn = 0;
    try {
      const approvedWithdrawals = await this.prisma.withdrawRequest.findMany({
        where: { userId, status: 'APPROVED' },
      });
      withdrawn = approvedWithdrawals.reduce((s, w) => s + Number(w.amount), 0);
    } catch {
      // withdraw_request table may not exist yet (migration pending)
    }
    return {
      awards,
      totalValue,
      count: awards.length,
      approvedCount: awards.filter((a) => a.status === 'APPROVED').length,
      withdrawn,
      available: totalValue - withdrawn,
    };
  }
  async getPending() {
    return this.prisma.userAward.findMany({
      where: { status: 'PENDING' },
      include: { Pack: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async approve(
    id: string,
    receipt?: {
      receiptFile?: string;
      receiptData?: string;
      receiptMime?: string;
    },
  ) {
    const ua = await this.prisma.userAward.findUnique({
      where: { id },
      include: { Pack: true },
    });
    if (!ua) throw new NotFoundException('المكافأة غير موجودة');
    if (ua.status !== 'PENDING')
      throw new BadRequestException('يمكن قبول المكافآت المعلقة فقط');
    const data: any = { status: 'APPROVED' };
    if (receipt?.receiptFile) data.receiptFile = receipt.receiptFile;
    if (receipt?.receiptData) data.receiptData = receipt.receiptData;
    if (receipt?.receiptMime) data.receiptMime = receipt.receiptMime;
    await this.prisma.$transaction(async (tx: any) => {
      // Atomic claim: the expense row is only written by the single request
      // that flips PENDING → APPROVED (double-approve cannot double-charge).
      const claimed = await tx.userAward.updateMany({
        where: { id, status: 'PENDING' },
        data,
      });
      if (claimed.count === 0) {
        throw new BadRequestException('يمكن قبول المكافآت المعلقة فقط');
      }
      await tx.expense.create({
        data: {
          amount: ua.Pack.awardValue,
          reason: `مكافأة: ${ua.Pack.title}`,
        },
      });
    });
    return { message: 'تم قبول المكافأة وتسجيل المصروف' };
  }
  async reject(id: string, rejectReason?: string) {
    const ua = await this.prisma.userAward.findUnique({ where: { id } });
    if (!ua) throw new NotFoundException('المكافأة غير موجودة');
    if (ua.status !== 'PENDING')
      throw new BadRequestException('يمكن رفض المكافآت المعلقة فقط');
    const data: any = { status: 'REJECTED' };
    if (rejectReason) data.rejectReason = rejectReason;
    await this.prisma.userAward.update({ where: { id }, data });
    return { message: 'تم رفض المكافأة' };
  }
  async getHistory() {
    return this.prisma.userAward.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      include: { Pack: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
  private async findOnePack(id: string) {
    const p = await this.prisma.awardPack.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('حزمة المكافأة غير موجودة');
    return p;
  }

  async getPendingWithdrawals() {
    return this.prisma.withdrawRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        User: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWithdrawalHistory() {
    return this.prisma.withdrawRequest.findMany({
      include: { User: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveWithdrawal(
    id: string,
    receipt?: {
      receiptFile?: string;
      receiptData?: string;
      receiptMime?: string;
    },
  ) {
    const wr = await this.prisma.withdrawRequest.findUnique({ where: { id } });
    if (!wr) throw new NotFoundException('طلب السحب غير موجود');
    const data: any = { status: 'APPROVED' as WithdrawStatus };
    if (receipt?.receiptFile) data.receiptFile = receipt.receiptFile;
    if (receipt?.receiptData) data.receiptData = receipt.receiptData;
    if (receipt?.receiptMime) data.receiptMime = receipt.receiptMime;
    // Only the request that atomically flips PENDING → APPROVED wins.
    const claimed = await this.prisma.withdrawRequest.updateMany({
      where: { id, status: 'PENDING' },
      data,
    });
    if (claimed.count === 0) {
      throw new BadRequestException('يمكن قبول الطلبات المعلقة فقط');
    }
    return this.prisma.withdrawRequest.findUnique({ where: { id } });
  }

  async rejectWithdrawal(id: string) {
    const wr = await this.prisma.withdrawRequest.findUnique({ where: { id } });
    if (!wr) throw new NotFoundException('طلب السحب غير موجود');
    const claimed = await this.prisma.withdrawRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('يمكن رفض الطلبات المعلقة فقط');
    }
    return this.prisma.withdrawRequest.findUnique({ where: { id } });
  }
}
