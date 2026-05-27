import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from './ws-events.constants';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:4200',
      'http://localhost:4100',
      'http://localhost:4000',
    ],
    credentials: true,
  },
  namespace: '/',
})
export class RihlaWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(_client: Socket) {}

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(client: Socket, room: string) {
    client.leave(room);
  }

  @SubscribeMessage(WS_EVENTS.WATCH_SEATS)
  handleWatchSeats(client: Socket, tripId: string) {
    const room = `trip:${tripId}`;
    client.join(room);
  }

  @SubscribeMessage(WS_EVENTS.UNWATCH_SEATS)
  handleUnwatchSeats(client: Socket, tripId: string) {
    const room = `trip:${tripId}`;
    client.leave(room);
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

  emitSeatUpdate(tripId: string, data: {
    seatNumbers: number[];
    action: 'booked' | 'held' | 'released';
    bookingId?: string;
  }) {
    this.server.to(`trip:${tripId}`).emit(WS_EVENTS.SEAT_UPDATED, { tripId, ...data });
  }
}
