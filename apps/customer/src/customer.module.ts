import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { UsersModule } from './users/users.module';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PushModule } from './push/push.module';
import { BlogModule } from './blog/blog.module';
import { AwardsModule } from './awards/awards.module';
import { TicketsModule } from './tickets/tickets.module';
import { TafiyaWsModule } from '@app/websocket';
import { MulterExceptionFilter } from './filters/multer-exception.filter';

@Module({
  imports: [UsersModule, BookingModule, NotificationsModule, PushModule, BlogModule, AwardsModule, TicketsModule, TafiyaWsModule],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    { provide: APP_FILTER, useClass: MulterExceptionFilter },
  ],
})
export class CustomerModule {}
