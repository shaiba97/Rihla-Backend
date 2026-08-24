import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { CompanyModule } from './company.module';
import { RedisIoAdapter } from '@app/websocket';
import * as path from 'path';
import * as express from 'express';
import { getWhatsAppSock } from './config/whatsapp';

function validateEnv(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

// ---- Minimal dependency-free HTTP hardening -------------------------------
// Security headers (helmet is not installed; these cover the API essentials).
function securityHeaders(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// Fixed-window rate limiter for unauthenticated, abuse-prone routes
// (login brute force / registration spam). Per-instance; adequate while the
// service runs as a single instance.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_HITS = 20;
const rateHits = new Map<string, number[]>();

function clientIpOf(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

function rateLimit(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const target = req.originalUrl ?? req.url ?? '';
  if (!/(post-login|post-user)/.test(target) || req.method !== 'POST') {
    next();
    return;
  }
  const ip = clientIpOf(req);
  const now = Date.now();
  const hits = (rateHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  rateHits.set(ip, hits);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (rateHits.size > 10_000) {
    for (const [key, times] of rateHits) {
      if (!times.some((t) => now - t < RATE_WINDOW_MS)) {
        rateHits.delete(key);
      }
    }
  }

  if (hits.length > RATE_MAX_HITS) {
    res
      .status(429)
      .json({ message: 'محاولات كثيرة جدًا، يرجى المحاولة بعد قليل' });
    return;
  }
  next();
}

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(CompanyModule);
  app.useWebSocketAdapter(new RedisIoAdapter(app));
  app.setGlobalPrefix('api');

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http://') || s.startsWith('https://'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : [
            'http://localhost:4200',
            'http://localhost:4100',
            'http://localhost:4000',
          ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  app.use(securityHeaders);
  app.use(rateLimit);

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
  new Logger('Bootstrap').log(
    `Company service started on port ${process.env.COMPANY_PORT ?? 3001}`,
  );

  if (process.env.WHATSAPP_ENABLED === 'true') {
    getWhatsAppSock().catch((err: any) => {
      new Logger('WhatsApp').error('WhatsApp init failed: ' + err.message);
    });
  } else {
    new Logger('WhatsApp').log(
      'WhatsApp not enabled (set WHATSAPP_ENABLED=true to enable)',
    );
  }
}
bootstrap();
