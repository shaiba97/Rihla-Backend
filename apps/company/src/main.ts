import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { CompanyModule } from './company.module';
import { RedisIoAdapter } from '@app/websocket';
import * as path from 'path';
import * as express from 'express';
import { getWhatsAppSock } from './config/whatsapp';

function validateEnv(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(CompanyModule);
  app.useWebSocketAdapter(new RedisIoAdapter(app));
  app.setGlobalPrefix('api');

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith('http://') || s.startsWith('https://'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:4200', 'http://localhost:4100', 'http://localhost:4000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  const serveSafe = (dir: string) => (req: any, res: any, next: any) => {
    const ext = path.extname(req.path).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf'];
    if (allowed.includes(ext) || !ext) {
      return express.static(dir)(req, res, next);
    }
    res.status(403).send('Forbidden');
  };
  app.use('/uploads', serveSafe(path.join(process.cwd(), 'uploads')));

  await app.listen(process.env.COMPANY_PORT ?? 3001);
  new Logger('Bootstrap').log(`Company service started on port ${process.env.COMPANY_PORT ?? 3001}`);

  if (process.env.WHATSAPP_ENABLED === 'true') {
    getWhatsAppSock().catch((err: any) => {
      new Logger('WhatsApp').error('WhatsApp init failed: ' + err.message);
    });
  } else {
    new Logger('WhatsApp').log('WhatsApp not enabled (set WHATSAPP_ENABLED=true to enable)');
  }
}
bootstrap();
