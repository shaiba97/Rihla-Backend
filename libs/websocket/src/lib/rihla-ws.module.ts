import { Global, Module } from '@nestjs/common';
import { RihlaWsGateway } from './rihla-ws.gateway';

@Global()
@Module({
  providers: [RihlaWsGateway],
  exports: [RihlaWsGateway],
})
export class RihlaWsModule {}
