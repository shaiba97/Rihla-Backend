import { NestFactory } from '@nestjs/core';
import { AdminModule } from './admin.module';
import { RedisIoAdapter } from '@app/websocket';
import * as path from 'path';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AdminModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('AdminApp');

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

  app.use('/upload', express.static(path.join(__dirname, '../../../upload')));
  app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

  const port = configService.get<number>('ADMIN_PORT', 3000);
  await app.listen(port);
  logger.log(`Admin service started on port ${port}`);
}
bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
