import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { AwardsController } from './awards.controller';
import { AwardsService } from './awards.service';
@Module({
  imports: [PrismaModule],
  controllers: [AwardsController],
  providers: [AwardsService],
})
export class AwardsModule {}
