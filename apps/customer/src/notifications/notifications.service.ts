import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
import { PushService } from '../push/push.service';

interface CreateNotifParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  emitTo?: string;
  sendPush?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: TafiyaWsGateway,
    @Inject(forwardRef(() => PushService))
    private readonly push: PushService,
  ) {}

  async create(data: CreateNotifParams) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        body: data.body,
        data: data.data ?? {},
      },
    });

    const payload: Record<string, any> = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      isRead: false,
      createdAt: notification.createdAt,
      hasSound: true,
    };

    if (data.emitTo === 'admin') {
      this.ws.emitToAdmin(WS_EVENTS.NOTIFICATION_NEW, payload);
    } else if (data.emitTo) {
      this.ws.emitToRoom(data.emitTo, WS_EVENTS.NOTIFICATION_NEW, payload);
    } else {
      this.ws.emitToCustomer(data.userId, WS_EVENTS.NOTIFICATION_NEW, payload);
    }

    if (data.sendPush !== false) {
      this.sendPushNotification(data.userId, {
        title: data.title,
        body: data.body,
        data: { notificationId: notification.id, type: data.type, ...(data.data ?? {}) },
      });
    }

    return notification;
  }

  private async sendPushNotification(
    userId: string,
    msg: { title: string; body: string; data: Record<string, string> },
  ): Promise<void> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });
      if (tokens.length === 0) return;
      await this.push.sendMulticast(
        tokens.map(t => t.token),
        msg,
      );
    } catch { /* silent */ }
  }

  async findByUser(userId: string, limit: number = 30) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);
    return { notifications, unreadCount };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async clearAll(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async registerDeviceToken(userId: string, token: string, platform: string) {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { userId_token: { userId, token } },
    });
    if (existing) return existing;
    return this.prisma.deviceToken.create({
      data: { userId, token, platform },
    });
  }

  async unregisterDeviceToken(userId: string, token: string) {
    return this.prisma.deviceToken.deleteMany({
      where: { userId, token },
    });
  }

  async getUserDeviceTokens(userId: string) {
    return this.prisma.deviceToken.findMany({
      where: { userId },
      select: { id: true, token: true, platform: true, createdAt: true },
    });
  }
}
