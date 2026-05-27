import { Injectable, NotFoundException } from '@nestjs/common'; import { PrismaService } from '@app/prisma'; import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';
@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: RihlaWsGateway,
  ) {}
  async getAll() { return this.prisma.expense.findMany({ orderBy: { createdAt: 'desc' } }); }
  async create(data: { amount: number; reason: string }) {
    const expense = await this.prisma.expense.create({ data });
    this.wsGateway.emitToAdmin(WS_EVENTS.FINANCIAL_UPDATED, { trigger: 'expense_created' });
    return expense;
  }
  async update(id: string, data: { amount?: number; reason?: string }) { await this.findOne(id); const expense = await this.prisma.expense.update({ where: { id }, data }); this.wsGateway.emitToAdmin(WS_EVENTS.FINANCIAL_UPDATED, { trigger: 'expense_updated' }); return expense; }
  async remove(id: string) { await this.findOne(id); const expense = await this.prisma.expense.delete({ where: { id } }); this.wsGateway.emitToAdmin(WS_EVENTS.FINANCIAL_UPDATED, { trigger: 'expense_deleted' }); return expense; }
  async getTotal() { const r = await this.prisma.expense.aggregate({ _sum: { amount: true } }); return Number(r._sum.amount ?? 0); }
  private async findOne(id: string) { const e = await this.prisma.expense.findUnique({ where: { id } }); if (!e) throw new NotFoundException('المصروف غير موجود'); return e; }
}
