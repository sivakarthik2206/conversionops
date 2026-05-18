import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Conversation } from '@conversionops/db';
import type { EscalationLevelInput } from './commands/escalate-conversation.command';

@Injectable()
export class HumanOverrideService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns true if AI is allowed to send on this conversation.
   * False when workspace.aiPaused OR conversation.aiActive=false.
   */
  async isAIAllowed(conversationId: string, workspaceId: string): Promise<boolean> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId, deletedAt: null },
      select: { aiActive: true, workspace: { select: { aiPaused: true } } },
    });
    if (!conversation) return false;
    return conversation.aiActive && !conversation.workspace.aiPaused;
  }

  /**
   * Human agent takes over a conversation. Sets aiActive=false and records the agent.
   * @returns Result<Conversation> — never throws
   */
  async takeoverConversation(
    conversationId: string,
    agentId: string,
    workspaceId: string,
    reason?: string,
  ): Promise<Result<Conversation>> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId, deletedAt: null },
      });
      if (!conversation) {
        return { ok: false, error: new TenantLeakageError(conversationId, workspaceId) };
      }

      const updated = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          aiActive: false,
          status: 'HUMAN_ACTIVE',
          takenOverBy: agentId,
          takenOverAt: new Date(),
          releasedAt: null,
        },
      });

      await this.appendLeadEvent(conversation.leadId, workspaceId, 'lead.human.takeover', agentId, {
        conversationId,
        reason: reason ?? null,
      });

      await queues.auditLog
        .add('conversation.takeover', { workspaceId, userId: agentId, action: 'conversation.takeover', resource: 'conversation', resourceId: conversationId }, { removeOnComplete: 1000 })
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'HumanOverrideService.takeoverConversation error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Releases a conversation back to AI. Clears takeover fields.
   * @returns Result<Conversation> — never throws
   */
  async releaseToAI(
    conversationId: string,
    agentId: string,
    workspaceId: string,
  ): Promise<Result<Conversation>> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId, deletedAt: null },
      });
      if (!conversation) {
        return { ok: false, error: new TenantLeakageError(conversationId, workspaceId) };
      }

      const updated = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          aiActive: true,
          status: 'AI_ACTIVE',
          takenOverBy: null,
          releasedAt: new Date(),
        },
      });

      await this.appendLeadEvent(conversation.leadId, workspaceId, 'lead.human.released', agentId, { conversationId });

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'HumanOverrideService.releaseToAI error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Escalates a conversation. URGENT level forces AI off.
   * @returns Result<Conversation> — never throws
   */
  async escalate(
    conversationId: string,
    level: EscalationLevelInput,
    reason: string | undefined,
    workspaceId: string,
  ): Promise<Result<Conversation>> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId, deletedAt: null },
        include: { lead: { select: { assignedWorkspaceUserId: true } } },
      });
      if (!conversation) {
        return { ok: false, error: new TenantLeakageError(conversationId, workspaceId) };
      }

      const updated = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          escalationLevel: level,
          escalationReason: reason ?? null,
          escalatedAt: new Date(),
          ...(level === 'URGENT' && { aiActive: false, status: 'HUMAN_ACTIVE' }),
        },
      });

      const assignedAgent = conversation.lead?.assignedWorkspaceUserId;
      if (assignedAgent) {
        await queues.notification
          .add('escalation', { workspaceId, workspaceUserId: assignedAgent, conversationId, type: 'AI_ESCALATION', level, reason }, { removeOnComplete: 500, priority: level === 'URGENT' ? 1 : 3 })
          .catch((err: unknown) => logger.error({ err }, 'notification enqueue failed'));
      }

      await queues.auditLog
        .add('conversation.escalated', { workspaceId, action: 'conversation.escalated', resource: 'conversation', resourceId: conversationId, metadata: { level, reason } }, { removeOnComplete: 1000 })
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'HumanOverrideService.escalate error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  private async appendLeadEvent(
    leadId: string,
    workspaceId: string,
    type: string,
    triggeredBy: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const last = await this.prisma.leadEvent.findFirst({
      where: { leadId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    await this.prisma.leadEvent.create({
      data: {
        leadId,
        workspaceId,
        sequence: (last?.sequence ?? 0) + 1,
        type,
        payload: payload as Record<string, never>,
        triggeredBy,
      },
    });
  }
}
