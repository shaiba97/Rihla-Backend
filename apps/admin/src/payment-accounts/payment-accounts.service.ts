import { Injectable, NotFoundException } from '@nestjs/common'; import { PrismaService } from '@app/prisma'; import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';
@Injectable()
export class PaymentAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: RihlaWsGateway,
  ) {}
  async getAll() { return this.prisma.paymentAccount.findMany({ orderBy: { createdAt: 'desc' } }); }
  async create(data: any) {
    if (!data.gatewayKey) data.gatewayKey = data.gatewayName;
    const account = await this.prisma.paymentAccount.create({ data });
    this.wsGateway.emitPublic(WS_EVENTS.ACCOUNT_CREATED, account);
    return account;
  }
  async update(id: string, data: any) {
    await this.findOne(id);
    const account = await this.prisma.paymentAccount.update({ where: { id }, data });
    this.wsGateway.emitPublic(WS_EVENTS.ACCOUNT_UPDATED, account);
    return account;
  }
  async toggleActive(id: string) {
    const a = await this.findOne(id);
    const account = await this.prisma.paymentAccount.update({ where: { id }, data: { isActive: !a.isActive } });
    this.wsGateway.emitPublic(WS_EVENTS.ACCOUNT_TOGGLED, account);
    return account;
  }
  async remove(id: string) {
    await this.findOne(id);
    const account = await this.prisma.paymentAccount.delete({ where: { id } });
    this.wsGateway.emitToAdmin(WS_EVENTS.ACCOUNT_DELETED, { id });
    return account;
  }
  private async findOne(id: string) { const a = await this.prisma.paymentAccount.findUnique({ where: { id } }); if (!a) throw new NotFoundException('غير موجود'); return a; }
}
