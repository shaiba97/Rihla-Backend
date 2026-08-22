import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TafiyaWsGateway } from './tafiya-ws.gateway';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [TafiyaWsGateway],
  exports: [TafiyaWsGateway],
})
export class TafiyaWsModule {}
