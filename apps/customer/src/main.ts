import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { CustomerModule } from './customer.module';
import { RedisIoAdapter } from '@app/websocket';
import * as path from 'path';
import * as express from 'express';
import * as fs from 'fs';

function validateEnv(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

const logger = new Logger('Bootstrap');

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(CustomerModule);
  app.useWebSocketAdapter(new RedisIoAdapter(app));

  app.setGlobalPrefix('api');

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith('http://') || s.startsWith('https://'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:4200', 'http://localhost:4100', 'http://localhost:4000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  // Create upload directory structure
  const uploadDir = path.join(__dirname, '../../../upload');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.log(`✅ Created upload directory: ${uploadDir}`);
  }

  const uploadsDir = path.join(__dirname, '../../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.log(`✅ Created uploads directory: ${uploadsDir}`);
  }

  const serveSafe = (dir: string) => (req: any, res: any, next: any) => {
    const ext = path.extname(req.path).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf'];
    if (allowed.includes(ext) || !ext) {
      return express.static(dir)(req, res, next);
    }
    res.status(403).send('Forbidden');
  };
  app.use('/upload', serveSafe(path.join(__dirname, '../../../upload')));
  app.use('/uploads', serveSafe(path.join(__dirname, '../../../uploads')));

  await app.listen(process.env.CUSTOMER_PORT ?? 3002);
  logger.log(`Customer service started on port ${process.env.CUSTOMER_PORT ?? 3002}`);
}
bootstrap();
