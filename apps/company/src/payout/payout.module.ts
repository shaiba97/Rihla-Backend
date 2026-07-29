import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { TafiyaWsModule } from '@app/websocket';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayoutController } from './controller/payout.controller';
import { PayoutService } from './service/payout.service';

@Module({
  imports: [PrismaModule, TafiyaWsModule, NotificationsModule],
  controllers: [PayoutController],
  providers: [PayoutService],
})
export class PayoutModule {}
