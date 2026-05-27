import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { BlogService } from './blog.service';

@UseGuards(AuthGuard('jwt'))
@Controller('admin/blog')
export class BlogController {
  constructor(private readonly svc: BlogService) {}

  @Get()
  getAll() { return this.svc.getAll(); }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.svc.getOne(id); }

  @Post()
  create(@Body() body: { title: string; slug: string; content: string; excerpt?: string; coverImage?: string; published?: boolean }, @Req() req: Request) {
    return this.svc.create({ ...body, authorId: (req as any).user.id });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; slug?: string; content?: string; excerpt?: string; coverImage?: string; published?: boolean }) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
