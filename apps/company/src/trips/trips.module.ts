import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { TripsController } from './controller/trips.controller';
import { TripsService } from './service/trips.service';
import { TripSchedulerService } from './service/trip-scheduler.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { PdfModule } from '@app/pdf';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    RedisModule,
    PdfModule,
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [TripsController],
  providers: [TripsService, TripSchedulerService],
})
export class TripsModule {}
