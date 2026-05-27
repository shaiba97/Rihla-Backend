import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { UsersModule } from './users/users.module';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BlogModule } from './blog/blog.module';
import { RihlaWsModule } from '@app/websocket';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    BookingModule,
    NotificationsModule,
    BlogModule,
    RihlaWsModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
