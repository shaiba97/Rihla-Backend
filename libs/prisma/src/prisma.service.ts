import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma: PrismaClient;

  constructor() {
    const url = new URL(process.env.DATABASE_URL!);
    const pool = new Pool({
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.replace('/', ''),
      user: url.username,
      password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(pool);

    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      adapter,
    });
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      const err = error as { message?: string };
      this.logger.error('Database connection failed: ' + err.message);
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  get bus() { return this.prisma.bus; }
  get trip() { return this.prisma.trip; }
  get users() { return this.prisma.users; }
  get booking() { return this.prisma.booking; }
  get payment() { return this.prisma.payment; }
  get ticketPDF() { return this.prisma.ticketPDF; }
  get platformFee() { return this.prisma.platformFee; }
  get paymentAccount() { return this.prisma.paymentAccount; }
  get expense() { return this.prisma.expense; }
  get supportContact() { return this.prisma.supportContact; }
  get notification() { return this.prisma.notification; }
  get blogPost() { return this.prisma.blogPost; }

  async $connect() { return this.prisma.$connect(); }
  async $disconnect() { return this.prisma.$disconnect(); }
  async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> { return this.prisma.$transaction(fn); }
}
