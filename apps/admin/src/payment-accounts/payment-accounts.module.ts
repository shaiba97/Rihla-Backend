import { Module } from '@nestjs/common'; import { PrismaModule } from '@app/prisma'; import { PaymentAccountsController } from './payment-accounts.controller'; import { PaymentAccountsService } from './payment-accounts.service';
@Module({ imports: [PrismaModule], controllers: [PaymentAccountsController], providers: [PaymentAccountsService] })
export class PaymentAccountsModule {}
