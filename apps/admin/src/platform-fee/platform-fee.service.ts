import { Injectable, NotFoundException } from '@nestjs/common'; import { PrismaService } from '@app/prisma'; import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';
@Injectable()
export class PlatformFeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: RihlaWsGateway,
  ) {}
  async getAll() { return this.prisma.platformFee.findMany({ orderBy: { createdAt: 'desc' } }); }
  async getActive() { return this.prisma.platformFee.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }); }
  async create(data: { amount: number; currency?: string; description?: string }) {
    await this.prisma.platformFee.updateMany({ data: { isActive: false } });
    const fee = await this.prisma.platformFee.create({ data: { amount: data.amount, currency: data.currency ?? 'جنيه سوداني', description: data.description, isActive: true } });
    this.wsGateway.emitPublic(WS_EVENTS.PLATFORM_FEE_CREATED, fee);
    return fee;
  }
  async update(id: string, data: any) {
    await this.findOne(id);
    const fee = await this.prisma.platformFee.update({ where: { id }, data });
    this.wsGateway.emitPublic(WS_EVENTS.PLATFORM_FEE_UPDATED, fee);
    return fee;
  }
  async activate(id: string) {
    await this.findOne(id);
    await this.prisma.platformFee.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const fee = await this.prisma.platformFee.update({ where: { id }, data: { isActive: true } });
    this.wsGateway.emitPublic(WS_EVENTS.PLATFORM_FEE_ACTIVATED, fee);
    return fee;
  }
  async remove(id: string) {
    await this.findOne(id);
    const fee = await this.prisma.platformFee.delete({ where: { id } });
    this.wsGateway.emitToAdmin(WS_EVENTS.PLATFORM_FEE_DELETED, { id });
    return fee;
  }
  private async findOne(id: string) { const f = await this.prisma.platformFee.findUnique({ where: { id } }); if (!f) throw new NotFoundException('غير موجود'); return f; }
}
