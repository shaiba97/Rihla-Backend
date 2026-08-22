import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@app/prisma';
import { UsersModule } from '../users/users.module';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [TicketsController],
})
export class TicketsModule {}
