import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const BOOKING_SESSION_TTL = 1800;

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD || undefined;

    this.redis = new Redis({
      host,
      port,
      password,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      this.logger.log('✅ Redis connected');
    });

    this.redis.on('error', (err: Error) => {
      this.logger.error('❌ Redis error:', err.message);
    });
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    await this.redis.setex(key, ttl, value);
  }

  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  getClient(): Redis {
    return this.redis;
  }
}
