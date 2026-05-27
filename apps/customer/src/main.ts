import { NestFactory } from '@nestjs/core';
import { CustomerModule } from './customer.module';
import { RedisIoAdapter } from '@app/websocket';
import * as path from 'path';
import * as express from 'express';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(CustomerModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('CustomerApp');

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

  // Create upload directory structure
  const uploadDir = path.join(__dirname, '../../../upload');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.log(`Created upload directory: ${uploadDir}`);
  }

  const uploadsDir = path.join(__dirname, '../../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.log(`Created uploads directory: ${uploadsDir}`);
  }

  app.use('/upload', express.static(path.join(__dirname, '../../../upload')));
  app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

  const port = configService.get<number>('CUSTOMER_PORT', 3002);
  await app.listen(port);
  logger.log(`Customer service started on port ${port}`);
}
bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
