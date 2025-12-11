import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ParcelsService } from '../parcels/parcels.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class Gateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => ParcelsService))
    private parcelsService: ParcelsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      console.log(`Client connected: ${payload.email}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.data.user?.email}`);
  }

  @SubscribeMessage('track_parcel')
  async handleTrackParcel(
    @MessageBody() data: { trackingNumber: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const parcel = await this.parcelsService.findByTrackingNumber(
        data.trackingNumber,
      );
      client.emit('parcel_update', parcel);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('subscribe_parcel')
  async handleSubscribeParcel(
    @MessageBody() data: { parcelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`parcel_${data.parcelId}`);
  }

  @SubscribeMessage('unsubscribe_parcel')
  async handleUnsubscribeParcel(
    @MessageBody() data: { parcelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`parcel_${data.parcelId}`);
  }

  emitParcelUpdate(parcelId: string, parcel: any) {
    this.server.to(`parcel_${parcelId}`).emit('parcel_update', parcel);
  }
}

