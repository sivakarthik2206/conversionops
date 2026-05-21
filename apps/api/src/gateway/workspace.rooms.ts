import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';

@Injectable()
export class WorkspaceRoomsService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  getRoomName(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }

  /**
   * Conversation rooms are namespaced by workspaceId so that subscribing to a
   * raw conversationId is impossible. Combined with conversation-ownership
   * verification on join, this gives belt-and-braces tenant isolation on
   * websocket fanout.
   */
  getConversationRoom(workspaceId: string, conversationId: string): string {
    return `workspace:${workspaceId}:conv:${conversationId}`;
  }

  /**
   * Joins a client to a workspace room with tenant isolation enforcement.
   * Disconnects the client immediately if they attempt to join another workspace's room.
   */
  joinWorkspace(client: Socket, workspaceId: string, callerWorkspaceId: string): void {
    if (workspaceId !== callerWorkspaceId) {
      logger.error(
        { clientId: client.id, workspaceId, callerWorkspaceId },
        'WebSocket tenant isolation violation — disconnecting client',
      );
      client.emit('error', { message: 'Unauthorized: workspace mismatch', code: 'TENANT_LEAKAGE' });
      client.disconnect(true);
      throw new TenantLeakageError(workspaceId, callerWorkspaceId);
    }
    void client.join(this.getRoomName(workspaceId));
    logger.info({ clientId: client.id, workspaceId }, 'WebSocket: client joined workspace room');
  }

  leaveWorkspace(client: Socket, workspaceId: string): void {
    void client.leave(this.getRoomName(workspaceId));
  }

  /**
   * Emits an event to all clients in a workspace room.
   */
  emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
    if (!this.server) {
      logger.warn({ workspaceId, event }, 'WorkspaceRoomsService: server not initialised');
      return;
    }
    this.server.to(this.getRoomName(workspaceId)).emit(event, data);
  }

  /**
   * Emits an event to all clients subscribed to a specific conversation room.
   */
  emitToConversation(workspaceId: string, conversationId: string, event: string, data: unknown): void {
    if (!this.server) {
      logger.warn({ workspaceId, conversationId, event }, 'WorkspaceRoomsService: server not initialised');
      return;
    }
    this.server.to(this.getConversationRoom(workspaceId, conversationId)).emit(event, data);
  }
}
