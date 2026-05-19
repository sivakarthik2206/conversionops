import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { verifyToken } from '@conversionops/auth';
import { logger } from '@conversionops/observability';
import { PrismaService } from '../modules/prisma/prisma.service';
import { WorkspaceRoomsService } from './workspace.rooms';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    workspaceId?: string;
    role?: string;
  };
}

interface JoinConversationData {
  conversationId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env['APP_URL'] ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceRooms: WorkspaceRoomsService,
  ) {}

  afterInit(server: Server): void {
    this.workspaceRooms.setServer(server);

    const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    try {
      const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
      const subClient = pubClient.duplicate();
      server.adapter(createAdapter(pubClient, subClient));
      logger.info('RealtimeGateway: Redis adapter configured');
    } catch (err) {
      logger.error({ err }, 'RealtimeGateway: failed to configure Redis adapter, falling back to in-memory');
    }
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = client.handshake.auth['token'] as string | undefined;

    if (!token) {
      client.emit('error', { message: 'Unauthorized: no token', code: 'UNAUTHORIZED' });
      client.disconnect(true);
      return;
    }

    const jwtSecret = process.env['JWT_SECRET'] ?? '';
    const tokenResult = verifyToken(token, jwtSecret);

    if (!tokenResult.ok) {
      client.emit('error', { message: 'Unauthorized: invalid token', code: 'UNAUTHORIZED' });
      client.disconnect(true);
      return;
    }

    const userId = tokenResult.value.sub;

    const workspaceUser = await this.prisma.workspaceUser.findFirst({
      where: { userId, isActive: true, deletedAt: null },
      select: { workspaceId: true, role: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!workspaceUser) {
      client.emit('error', { message: 'Unauthorized: no active workspace', code: 'UNAUTHORIZED' });
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    client.data.workspaceId = workspaceUser.workspaceId;
    client.data.role = workspaceUser.role;

    try {
      this.workspaceRooms.joinWorkspace(client, workspaceUser.workspaceId, workspaceUser.workspaceId);
    } catch {
      return;
    }

    logger.info(
      { clientId: client.id, userId, workspaceId: workspaceUser.workspaceId },
      'WebSocket: client connected',
    );
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.data.workspaceId) {
      this.workspaceRooms.leaveWorkspace(client, client.data.workspaceId);
    }
    logger.info(
      { clientId: client.id, userId: client.data.userId },
      'WebSocket: client disconnected',
    );
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    client: AuthenticatedSocket,
    data: JoinConversationData,
  ): Promise<void> {
    if (!client.data.workspaceId) {
      client.emit('error', { message: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        workspaceId: client.data.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!conversation) {
      client.emit('error', { message: 'Conversation not found', code: 'NOT_FOUND' });
      return;
    }

    await client.join(this.workspaceRooms.getConversationRoom(data.conversationId));
    client.emit('joined:conversation', { conversationId: data.conversationId });
  }

  emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
    this.workspaceRooms.emitToWorkspace(workspaceId, event, data);
  }

  emitToConversation(conversationId: string, event: string, data: unknown): void {
    this.workspaceRooms.emitToConversation(conversationId, event, data);
  }
}
