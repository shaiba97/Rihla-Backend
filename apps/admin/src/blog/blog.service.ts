import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.blogPost.findMany({
      include: { author: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    if (!post) throw new NotFoundException('المقال غير موجود');
    return post;
  }

  async create(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    coverImage?: string;
    published?: boolean;
    authorId: string;
  }) {
    return this.prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        coverImage: data.coverImage,
        published: data.published ?? false,
        authorId: data.authorId,
      },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async update(id: string, data: {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    coverImage?: string;
    published?: boolean;
  }) {
    await this.getOne(id);
    return this.prisma.blogPost.update({
      where: { id },
      data,
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async remove(id: string) {
    await this.getOne(id);
    return this.prisma.blogPost.delete({ where: { id } });
  }
}
