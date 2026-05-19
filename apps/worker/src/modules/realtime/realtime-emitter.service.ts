import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Emitter } from '@socket.io/redis-emitter';
import { Redis } from 'ioredis';
import { logger } from '@conversionops/observability';

@Injectable()
export class RealtimeEmitterService implements OnModuleDestroy {
  private readonly emitter: Emitter | null;
  private readonly redisClient: Redis | null;

  constructor() {
    const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      this.emitter = new Emitter(this.redisClient);
    } catch (err) {
      logger.warn({ err }, 'RealtimeEmitter: failed to init Redis client, events will not be emitted');
      this.redisClient = null;
      this.emitter = null;
    }
  }

  /**
   * Emits an event to all clients in a workspace room.
   * Safe to call even if Redis is not available — will log and swallow.
   */
  emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
    if (!this.emitter) return;
    try {
      this.emitter.to(`workspace:${workspaceId}`).emit(event, data);
    } catch (err) {
      logger.warn({ err, workspaceId, event }, 'RealtimeEmitter: emit to workspace failed');
    }
  }

  /**
   * Emits an event to all clients subscribed to a conversation room.
   */
  emitToConversation(conversationId: string, event: string, data: unknown): void {
    if (!this.emitter) return;
    try {
      this.emitter.to(`conv:${conversationId}`).emit(event, data);
    } catch (err) {
      logger.warn({ err, conversationId, event }, 'RealtimeEmitter: emit to conversation failed');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisClient?.quit().catch(() => undefined);
  }
}
