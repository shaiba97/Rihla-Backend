import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.blogPost.findMany({
      where: { published: true },
      select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, createdAt: true, author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBySlug(slug: string) {
    return this.prisma.blogPost.findFirst({
      where: { slug, published: true },
      include: { author: { select: { name: true, avatar: true } } },
    });
  }
}
