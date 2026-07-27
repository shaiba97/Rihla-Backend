import { Injectable, NotFoundException } from '@nestjs/common'; import { PrismaService } from '@app/prisma'; import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
@Injectable()
export class PlatformFeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: TafiyaWsGateway,
  ) {}
  async getAll() { return this.prisma.platformFee.findMany({ orderBy: { createdAt: 'desc' } }); }
  async getActive() { return this.prisma.platformFee.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }); }
  async getActivePercentage(): Promise<number> {
    const activeFee = await this.prisma.platformFee.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    return activeFee?.percentage ?? 0;
  }
  async calculateFeeAmount(ticketPrice: number): Promise<number> {
    const pct = await this.getActivePercentage();
    return Math.round(ticketPrice * pct) / 100;
  }
  async create(data: { percentage: number; label?: string }) {
    await this.prisma.platformFee.updateMany({ data: { isActive: false } });
    const fee = await this.prisma.platformFee.create({ data: { percentage: data.percentage, label: data.label, isActive: true } });
    this.wsGateway.emitPublic(WS_EVENTS.PLATFORM_FEE_CREATED, fee);
    return fee;
  }
  async update(id: string, data: { percentage?: number; label?: string }) {
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