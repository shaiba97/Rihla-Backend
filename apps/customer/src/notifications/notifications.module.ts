import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { PushModule } from '../push/push.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => PushModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
