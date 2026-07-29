import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { TafiyaWsModule } from '@app/websocket';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminPayoutController } from './admin-payout.controller';
import { AdminPayoutService } from './admin-payout.service';

@Module({
  imports: [PrismaModule, TafiyaWsModule, NotificationsModule],
  controllers: [AdminPayoutController],
  providers: [AdminPayoutService],
})
export class AdminPayoutModule {}
