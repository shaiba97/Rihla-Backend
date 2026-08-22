import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from './ws-events.constants';

const wsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : ['http://localhost:4200', 'http://localhost:4100', 'http://localhost:4000'];

interface WsIdentity {
  id: string;
  role: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      ...wsOrigins,
      'https://rihla-customer-frontend.onrender.com',
      'https://rihla-admin.onrender.com',
      'https://rihla-company.onrender.com',
    ],
    credentials: true,
  },
  namespace: '/',
})
export class TafiyaWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TafiyaWsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Authenticates the handshake when a token is supplied. Connections without
   * a token stay connected for public features (live seat maps) but can never
   * join user rooms. A token that fails verification disconnects the client.
   */
  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      this.extractBearerToken(client.handshake.headers.authorization);

    if (!token) {
      client.data.user = null;
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET!,
      });

      if (!payload?.id || !payload?.role) {
        client.disconnect(true);
        return;
      }

      client.data.user = { id: payload.id, role: payload.role };
    } catch {
      this.logger.warn(`WS connection rejected: invalid token (${client.id})`);
      client.disconnect(true);
    }
  }

  handleDisconnect() {}

  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinRoom(client: Socket, room: string | { room: string }) {
    const roomName = typeof room === 'string' ? room : room.room;
    if (!this.canJoin(client, roomName)) return;
    client.join(roomName);
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(client: Socket, room: string | { room: string }) {
    const roomName = typeof room === 'string' ? room : room.room;
    if (!this.canJoin(client, roomName)) return;
    client.leave(roomName);
  }

  @SubscribeMessage(WS_EVENTS.WATCH_SEATS)
  handleWatchSeats(client: Socket, tripId: string) {
    if (typeof tripId !== 'string' || tripId.length === 0 || tripId.length > 64)
      return;
    client.join(`trip:${tripId}`);
  }

  @SubscribeMessage(WS_EVENTS.UNWATCH_SEATS)
  handleUnwatchSeats(client: Socket, tripId: string) {
    if (typeof tripId !== 'string' || tripId.length === 0 || tripId.length > 64)
      return;
    client.leave(`trip:${tripId}`);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  emitToAdmin(event: string, data: any) {
    this.server.to('admin').emit(event, data);
  }

  emitToCompany(companyId: string, event: string, data: any) {
    this.server.to(`company:${companyId}`).emit(event, data);
  }

  emitToCustomer(customerId: string, event: string, data: any) {
    this.server.to(`customer:${customerId}`).emit(event, data);
  }

  emitPublic(event: string, data: any) {
    this.server.emit(event, data);
  }

  emitSeatUpdate(
    tripId: string,
    data: {
      seatNumbers: number[];
      action: 'booked' | 'held' | 'released';
      bookingId?: string;
    },
  ) {
    this.server
      .to(`trip:${tripId}`)
      .emit(WS_EVENTS.SEAT_UPDATED, { tripId, ...data });
  }

  private extractBearerToken(header?: string): string | undefined {
    if (header && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return undefined;
  }

  /** Room membership is strictly tied to the authenticated identity. */
  private canJoin(client: Socket, roomName: unknown): boolean {
    const user: WsIdentity | null | undefined = client.data?.user;
    if (
      !user ||
      typeof roomName !== 'string' ||
      roomName.length === 0 ||
      roomName.length > 128
    ) {
      return false;
    }

    if (roomName === 'admin') {
      return user.role === 'ADMIN';
    }

    if (roomName.startsWith('company:')) {
      return user.role === 'COMPANY' && roomName === `company:${user.id}`;
    }

    if (roomName.startsWith('customer:')) {
      return roomName === `customer:${user.id}`;
    }

    // Unknown/private room prefixes are not joinable by clients.
    return false;
  }
}
