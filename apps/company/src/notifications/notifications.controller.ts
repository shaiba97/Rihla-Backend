import { Controller, Get, Patch, Delete, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  findAll(@Req() req: Request, @Query('limit') limit: string) {
    return this.svc.findByUser((req as any).user.id, +limit || 30);
  }

  @Get('unread-count')
  unreadCount(@Req() req: Request) {
    return this.svc.getUnreadCount((req as any).user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: Request) {
    return this.svc.markRead(id, (req as any).user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: Request) {
    return this.svc.markAllRead((req as any).user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.svc.remove(id, (req as any).user.id);
  }

  @Delete('clear-all')
  clearAll(@Req() req: Request) {
    return this.svc.clearAll((req as any).user.id);
  }
}
