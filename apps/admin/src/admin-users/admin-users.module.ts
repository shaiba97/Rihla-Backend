import { Module } from '@nestjs/common'; import { PrismaModule } from '@app/prisma'; import { AdminUsersController } from './admin-users.controller'; import { AdminUsersService } from './admin-users.service';
@Module({ imports: [PrismaModule], controllers: [AdminUsersController], providers: [AdminUsersService] })
export class AdminUsersModule {}
