import { Injectable } from '@nestjs/common'; import { PrismaService } from '@app/prisma';
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
  async getPacks() {
    return this.prisma.awardPack.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  }
}
