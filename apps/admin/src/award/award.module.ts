import { Module } from '@nestjs/common'; import { PrismaModule } from '@app/prisma'; import { AwardController } from './award.controller'; import { AwardService } from './award.service';
@Module({ imports: [PrismaModule], controllers: [AwardController], providers: [AwardService] })
export class AwardModule {}
