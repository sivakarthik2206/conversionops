import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Conversation } from '@conversionops/db';
import { TakeoverConversationCommand } from './takeover-conversation.command';

@Injectable()
export class TakeoverConversationHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Human agent takes over a conversation. Sets aiActive=false, records takeover.
   * @returns Result<Conversation> — never throws
   */
  async execute(cmd: TakeoverConversationCommand): Promise<Result<Conversation>> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: cmd.conversationId, workspaceId: cmd.workspaceId, deletedAt: null },
      });
      if (!conversation) {
        return { ok: false, error: new TenantLeakageError(cmd.conversationId, cmd.workspaceId) };
      }

      const updated = await this.prisma.conversation.update({
        where: { id: cmd.conversationId },
        data: {
          aiActive: false,
          status: 'HUMAN_ACTIVE',
          takenOverBy: cmd.agentId,
          takenOverAt: new Date(),
          releasedAt: null,
        },
      });

      await this.prisma.leadEvent.create({
        data: {
          workspaceId: cmd.workspaceId,
          leadId: conversation.leadId,
          sequence: await this.nextSequence(conversation.leadId),
          type: 'lead.human.takeover',
          payload: { conversationId: cmd.conversationId, agentId: cmd.agentId, reason: cmd.reason ?? null },
          triggeredBy: cmd.agentId,
        },
      });

      await queues.auditLog
        .add(
          'conversation.takeover',
          {
            workspaceId: cmd.workspaceId,
            userId: cmd.agentId,
            action: 'conversation.takeover',
            resource: 'conversation',
            resourceId: cmd.conversationId,
            metadata: { reason: cmd.reason },
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'TakeoverConversationHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  private async nextSequence(leadId: string): Promise<number> {
    const last = await this.prisma.leadEvent.findFirst({
      where: { leadId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    return (last?.sequence ?? 0) + 1;
  }
}
