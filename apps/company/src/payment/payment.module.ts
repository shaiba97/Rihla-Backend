import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { PaymentController } from './controller/payment.controller';
import { PaymentService } from './service/payment.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
