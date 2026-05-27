import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { PlatformFeeModule } from './platform-fee/platform-fee.module';
import { PaymentAccountsModule } from './payment-accounts/payment-accounts.module';
import { ExpenseModule } from './expense/expense.module';
import { AdminFinancialModule } from './admin-financial/admin-financial.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { SupportContactsModule } from './support-contacts/support-contacts.module';
import { BlogModule } from './blog/blog.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RihlaWsModule } from '@app/websocket';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    PlatformFeeModule,
    PaymentAccountsModule,
    ExpenseModule,
    AdminFinancialModule,
    AdminUsersModule,
    SupportContactsModule,
    BlogModule,
    NotificationsModule,
    RihlaWsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
