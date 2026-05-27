import { Module } from '@nestjs/common';
import { BusesController } from './controller/buses.controller';
import { BusesService } from './service/buses.service';
import { PrismaModule } from '@app/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [BusesController],
  providers: [BusesService],
})
export class BusesModule {}
