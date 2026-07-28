import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { PayoutController } from './controller/payout.controller';
import { PayoutService } from './service/payout.service';

@Module({
  imports: [PrismaModule],
  controllers: [PayoutController],
  providers: [PayoutService],
})
export class PayoutModule {}
