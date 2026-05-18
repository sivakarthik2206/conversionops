import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import { GetConversationQuery, ConversationDetailDto } from './get-conversation.query';

@Injectable()
export class GetConversationHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns conversation detail with last 50 messages and lead summary.
   * Always scoped by workspaceId.
   * @returns Result<ConversationDetailDto> — never throws
   */
  async execute(query: GetConversationQuery): Promise<Result<ConversationDetailDto>> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: query.conversationId, workspaceId: query.workspaceId, deletedAt: null },
        include: {
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 50,
            select: { id: true, role: true, content: true, createdAt: true },
          },
          lead: {
            select: { id: true, name: true, phone: true, status: true, tier: true, score: true },
          },
        },
      });

      if (!conversation) {
        return { ok: false, error: new TenantLeakageError(query.conversationId, query.workspaceId) };
      }

      return {
        ok: true,
        value: {
          id: conversation.id,
          workspaceId: conversation.workspaceId,
          leadId: conversation.leadId,
          channel: conversation.channel,
          status: conversation.status,
          aiActive: conversation.aiActive,
          escalationLevel: conversation.escalationLevel,
          escalationReason: conversation.escalationReason,
          takenOverBy: conversation.takenOverBy,
          takenOverAt: conversation.takenOverAt,
          contextSummary: conversation.contextSummary,
          messages: conversation.messages,
          lead: conversation.lead,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      };
    } catch (error) {
      logger.error({ err: error, conversationId: query.conversationId }, 'GetConversationHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
