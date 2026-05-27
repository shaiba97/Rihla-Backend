import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TripsController } from './controller/trips.controller';
import { TripsService } from './service/trips.service';
import { TripSchedulerService } from './service/trip-scheduler.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { PdfModule } from '@app/pdf';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), RedisModule, PdfModule],
  controllers: [TripsController],
  providers: [TripsService, TripSchedulerService],
})
export class TripsModule {}
