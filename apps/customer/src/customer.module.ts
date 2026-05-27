import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { UsersModule } from './users/users.module';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BlogModule } from './blog/blog.module';
import { RihlaWsModule } from '@app/websocket';
import { MulterExceptionFilter } from './filters/multer-exception.filter';

@Module({
  imports: [UsersModule, BookingModule, NotificationsModule, BlogModule, RihlaWsModule],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    { provide: APP_FILTER, useClass: MulterExceptionFilter },
  ],
})
export class CustomerModule {}
