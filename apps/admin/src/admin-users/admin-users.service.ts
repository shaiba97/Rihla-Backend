import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: RihlaWsGateway,
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
    const users = raw.map((u: any) => ({
      ...u,
      _count: { Booking: u.Booking?.length ?? 0, Bus: u.Bus?.length ?? 0 },
    }));
    return { users, total, page, pages: Math.ceil(total / limit) };
  }
  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: {
        Booking: {
          include: { Trip: true, Payment: true, TicketPDF: true },
          orderBy: { createdAt: 'desc' },
        },
        Bus: { include: { Trip: { include: { Bus: true } } } },
      },
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...safe } = user;
    return safe;
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
