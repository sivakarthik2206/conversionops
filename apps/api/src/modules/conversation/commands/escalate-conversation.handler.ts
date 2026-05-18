import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Conversation } from '@conversionops/db';
import { EscalateConversationCommand } from './escalate-conversation.command';

@Injectable()
export class EscalateConversationHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Escalates a conversation. URGENT level disables AI immediately.
   * @returns Result<Conversation> — never throws
   */
  async execute(cmd: EscalateConversationCommand): Promise<Result<Conversation>> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: cmd.conversationId, workspaceId: cmd.workspaceId, deletedAt: null },
        include: { lead: { select: { assignedWorkspaceUserId: true } } },
      });
      if (!conversation) {
        return { ok: false, error: new TenantLeakageError(cmd.conversationId, cmd.workspaceId) };
      }

      const updated = await this.prisma.conversation.update({
        where: { id: cmd.conversationId },
        data: {
          escalationLevel: cmd.level,
          escalationReason: cmd.reason,
          escalatedAt: new Date(),
          ...(cmd.level === 'URGENT' && { aiActive: false, status: 'HUMAN_ACTIVE' }),
        },
      });

      const assignedAgent = conversation.lead?.assignedWorkspaceUserId;
      if (assignedAgent) {
        await queues.notification
          .add(
            'escalation',
            {
              workspaceId: cmd.workspaceId,
              workspaceUserId: assignedAgent,
              conversationId: cmd.conversationId,
              type: 'AI_ESCALATION',
              level: cmd.level,
              reason: cmd.reason,
            },
            { removeOnComplete: 500, priority: cmd.level === 'URGENT' ? 1 : 3 },
          )
          .catch((err: unknown) => logger.error({ err }, 'notification enqueue failed'));
      }

      await queues.auditLog
        .add(
          'conversation.escalated',
          {
            workspaceId: cmd.workspaceId,
            userId: cmd.escalatedByUserId,
            action: 'conversation.escalated',
            resource: 'conversation',
            resourceId: cmd.conversationId,
            metadata: { level: cmd.level, reason: cmd.reason },
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'EscalateConversationHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
