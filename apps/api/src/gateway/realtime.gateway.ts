import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { verifyToken } from '@conversionops/auth';
import { logger } from '@conversionops/observability';
import { WorkspaceRoomsService } from './workspace.rooms';

interface JoinConversationPayload {
  conversationId: string;
  workspaceId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env['CORS_ORIGIN']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly rooms: WorkspaceRoomsService) {}

  async afterInit(server: Server): Promise<void> {
    this.rooms.setServer(server);

    const redisUrl = process.env['REDIS_URL'];
    if (redisUrl) {
      try {
        const pubClient = new Redis(redisUrl);
        const subClient = pubClient.duplicate();
        server.adapter(createAdapter(pubClient, subClient));
        logger.info('RealtimeGateway: Redis adapter initialised');
      } catch (err) {
        logger.error({ err }, 'RealtimeGateway: failed to initialise Redis adapter');
      }
    }
  }

  handleConnection(client: Socket): void {
    const token = extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      client.disconnect(true);
      return;
    }

    const result = verifyToken(token, secret);
    if (!result.ok) {
      logger.warn({ clientId: client.id }, 'WebSocket: invalid token — disconnecting');
      client.disconnect(true);
      return;
    }

    const { workspaceId } = result.value;
    client.data['workspaceId'] = workspaceId;

    this.rooms.joinWorkspace(client, workspaceId, workspaceId);
    logger.info({ clientId: client.id, workspaceId }, 'WebSocket: client connected');
  }

  handleDisconnect(client: Socket): void {
    logger.info({ clientId: client.id }, 'WebSocket: client disconnected');
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinConversationPayload,
  ): void {
    const clientWorkspaceId = client.data['workspaceId'] as string | undefined;
    if (!clientWorkspaceId || clientWorkspaceId !== payload.workspaceId) {
      client.emit('error', { message: 'Unauthorized: workspace mismatch', code: 'TENANT_LEAKAGE' });
      return;
    }

    void client.join(`conv:${payload.conversationId}`);
    logger.debug(
      { clientId: client.id, conversationId: payload.conversationId },
      'WebSocket: joined conversation room',
    );
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ): void {
    void client.leave(`conv:${payload.conversationId}`);
  }
}

function extractToken(client: Socket): string | null {
  const auth = client.handshake.auth as Record<string, unknown>;
  if (typeof auth['token'] === 'string') return auth['token'];

  const query = client.handshake.query;
  if (typeof query['token'] === 'string') return query['token'];

  return null;
}
