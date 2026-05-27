import { Controller, Get, Param } from '@nestjs/common';
import { BlogService } from './blog.service';

@Controller('blog')
export class BlogController {
  constructor(private readonly svc: BlogService) {}

  @Get()
  getAll() { return this.svc.getAll(); }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) { return this.svc.getBySlug(slug); }
}
