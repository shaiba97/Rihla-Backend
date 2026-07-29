import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: TafiyaWsGateway,
  ) {}

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    emitTo?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        body: data.body,
        data: data.data ?? {},
      },
    });

    const payload = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      isRead: false,
      createdAt: notification.createdAt,
    };

    if (data.emitTo === 'admin') {
      this.ws.emitToAdmin(WS_EVENTS.NOTIFICATION_NEW, payload);
    } else if (data.emitTo) {
      this.ws.emitToRoom(data.emitTo, WS_EVENTS.NOTIFICATION_NEW, payload);
    }

    return notification;
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
}
