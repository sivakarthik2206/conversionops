import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Conversation } from '@conversionops/db';
import { ReleaseToAICommand } from './release-to-ai.command';

@Injectable()
export class ReleaseToAIHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Releases conversation back to AI. Clears takeover fields.
   * @returns Result<Conversation> — never throws
   */
  async execute(cmd: ReleaseToAICommand): Promise<Result<Conversation>> {
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
          aiActive: true,
          status: 'AI_ACTIVE',
          takenOverBy: null,
          releasedAt: new Date(),
        },
      });

      await this.prisma.leadEvent.create({
        data: {
          workspaceId: cmd.workspaceId,
          leadId: conversation.leadId,
          sequence: await this.nextSequence(conversation.leadId),
          type: 'lead.human.released',
          payload: { conversationId: cmd.conversationId, agentId: cmd.agentId },
          triggeredBy: cmd.agentId,
        },
      });

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'ReleaseToAIHandler error');
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
