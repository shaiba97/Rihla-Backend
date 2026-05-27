import { Module } from '@nestjs/common';
import { BookingController } from './controller/booking.controller';
import { BookingService } from './service/booking.service';
import { PaymentService } from './service/payment.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '@app/pdf';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';

@Module({
  imports: [PrismaModule, RedisModule, PdfModule, NotificationsModule],
  controllers: [BookingController],
  providers: [BookingService, PaymentService],
  exports: [BookingService],
})
export class BookingModule {}
