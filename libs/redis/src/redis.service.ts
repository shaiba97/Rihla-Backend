import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const BOOKING_SESSION_TTL = 1800;

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connected = false;

  onModuleInit() {
    const host = process.env.REDIS_HOST;
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD || undefined;

    if (!host) {
      this.logger.warn('REDIS_HOST not set — running without Redis');
      return;
    }

    this.client = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      connectTimeout: 5000,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    this.client.on('error', () => {
      this.connected = false;
    });

    this.client.connect().catch(() => {});
  }

  private isAvailable(): boolean {
    return this.client !== null && this.connected;
  }

  async ping(): Promise<string> {
    if (!this.isAvailable()) return 'NO_REDIS';
    return this.client!.ping();
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      return await this.client!.get(key);
    } catch {
      return null;
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.setex(key, ttl, value);
    } catch {}
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.set(key, value);
    } catch {}
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.del(key);
    } catch {}
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isAvailable()) return [];
    try {
      return await this.client!.keys(pattern);
    } catch {
      return [];
    }
  }

  getClient(): Redis | null {
    return this.client;
  }
}
