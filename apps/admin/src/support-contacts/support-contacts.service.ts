import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class SupportContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.supportContact.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data: { type: string; value: string; label?: string; isActive?: boolean }) {
    return this.prisma.supportContact.create({ data });
  }

  async update(id: string, data: { type?: string; value?: string; label?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.supportContact.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supportContact.delete({ where: { id } });
  }

  private async findOne(id: string) {
    const item = await this.prisma.supportContact.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('جهة الاتصال غير موجودة');
    return item;
  }
}
