import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueService } from './queue.service';

@Injectable()
@WebSocketGateway({
  namespace: '/drops',
  cors: {
    origin: '*',
  },
})
export class QueueGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QueueGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(private readonly queueService: QueueService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized (namespace: /drops)');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.userSockets.set(userId, client.id);
    }
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove from userSockets map
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:drop')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dropId: string },
  ) {
    const room = `drop:${data.dropId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
    return { event: 'joined', data: { room } };
  }

  @SubscribeMessage('join:branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    const room = `branch:${data.branchId}`;
    client.join(room);
    return { event: 'joined', data: { room } };
  }

  /**
   * Broadcast queue positions to all users in a drop room every 10 seconds.
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async broadcastPositions() {
    if (!this.server) return;

    // Get all socket rooms and filter for drop rooms
    const sockets = await this.server.fetchSockets();
    const dropRooms = new Set<string>();

    for (const socket of sockets) {
      for (const room of socket.rooms) {
        if (room.startsWith('drop:')) {
          dropRooms.add(room);
        }
      }
    }

    for (const roomName of dropRooms) {
      const dropId = roomName.replace('drop:', '');
      const queueSize = await this.queueService.getQueueSize(dropId);

      this.server.to(roomName).emit('queue:position', {
        dropId,
        queueSize,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Notify a specific user that their purchase window is granted.
   */
  notifyWindow(userId: string, dropId: string) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('queue:window', {
        dropId,
        expiresIn: 300, // 5 minutes
      });
    }
  }

  /**
   * Handle drop.started event — broadcast to room.
   */
  @OnEvent('drop.started')
  handleDropStarted(payload: { dropId: string; name: string }) {
    if (!this.server) return;
    const room = `drop:${payload.dropId}`;
    this.server.to(room).emit('drop:started', {
      dropId: payload.dropId,
      name: payload.name,
    });
  }

  /**
   * Handle drop.ended event — broadcast to room.
   */
  @OnEvent('drop.ended')
  handleDropEnded(payload: { dropId: string; reason: string }) {
    if (!this.server) return;
    const room = `drop:${payload.dropId}`;
    this.server.to(room).emit('drop:ended', {
      dropId: payload.dropId,
      reason: payload.reason,
    });
  }

  /**
   * Emit stock:updated to a branch room.
   */
  emitStockUpdate(branchId: string, figureId: string, available: number) {
    if (!this.server) return;
    const room = `branch:${branchId}`;
    this.server.to(room).emit('stock:updated', {
      figureId,
      available,
    });
  }
}
