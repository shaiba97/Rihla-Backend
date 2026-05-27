import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

@Module({ imports: [PrismaModule], controllers: [BlogController], providers: [BlogService] })
export class BlogModule {}
