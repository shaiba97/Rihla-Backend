import { NestFactory } from '@nestjs/core';
import { CompanyModule } from './company.module';
import { RedisIoAdapter } from '@app/websocket';
import * as path from 'path';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { getWhatsAppSock } from './config/whatsapp';

async function bootstrap() {
  const app = await NestFactory.create(CompanyModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('CompanyApp');

  app.useWebSocketAdapter(new RedisIoAdapter(app));
  app.setGlobalPrefix('api');

  // Parse CORS origins from environment variable
  const corsOriginsString = configService.get<string>('CORS_ORIGINS', 'http://localhost:4000,http://localhost:4100,http://localhost:4200');
  const corsOrigins = corsOriginsString.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const port = configService.get<number>('COMPANY_PORT', 3001);
  await app.listen(port);
  logger.log(`Company service started on port ${port}`);

  getWhatsAppSock().catch((err: any) => {
    logger.error(`WhatsApp init failed: ${err.message}`);
  });
}
bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
