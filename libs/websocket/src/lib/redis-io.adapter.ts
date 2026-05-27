import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);

    const host = process.env.REDIS_HOST || 'localhost';
    const portNum = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD || undefined;

    const pubClient = new Redis({ host, port: portNum, password });
    const subClient = pubClient.duplicate();

    server.adapter(createAdapter(pubClient, subClient));

    return server;
  }
}
