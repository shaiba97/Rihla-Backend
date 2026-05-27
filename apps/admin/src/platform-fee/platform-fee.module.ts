import { Module } from '@nestjs/common'; import { PrismaModule } from '@app/prisma'; import { PlatformFeeController } from './platform-fee.controller'; import { PlatformFeeService } from './platform-fee.service';
@Module({ imports: [PrismaModule], controllers: [PlatformFeeController], providers: [PlatformFeeService] })
export class PlatformFeeModule {}
