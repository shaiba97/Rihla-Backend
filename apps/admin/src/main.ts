import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AdminModule } from './admin.module';
import { RedisIoAdapter } from '@app/websocket';
import * as path from 'path';
import * as express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
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
  const app = await NestFactory.create(AdminModule);
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
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || origin.startsWith('http://localhost') || corsOrigins.includes(origin) || corsOrigins.length === 0)
        cb(null, true);
      else
        cb(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

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

  const payoutsDir = path.join(uploadsDir, 'payouts');
  if (!fs.existsSync(payoutsDir)) {
    fs.mkdirSync(payoutsDir, { recursive: true });
    logger.log(`Created payouts directory: ${payoutsDir}`);
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

  app.use(
    '/api-customer',
    createProxyMiddleware({
      target: 'http://127.0.0.1:3002',
      pathRewrite: { '^/': '/api/' },
      changeOrigin: true,
    }),
  );

  app.use(
    '/api-company',
    createProxyMiddleware({
      target: 'http://127.0.0.1:3001',
      pathRewrite: { '^/': '/api/' },
      changeOrigin: true,
    }),
  );

  await app.listen(process.env.ADMIN_PORT ?? 3000);
  logger.log(`Admin service started on port ${process.env.ADMIN_PORT ?? 3000}`);
}
bootstrap();
