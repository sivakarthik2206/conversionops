import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { Prisma, ConversationStatus } from '@conversionops/db';
import { ListConversationsQuery, ConversationListDto } from './list-conversations.query';

@Injectable()
export class ListConversationsHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns cursor-paginated conversations for a workspace.
   * @returns Result<ConversationListDto> — never throws
   */
  async execute(query: ListConversationsQuery): Promise<Result<ConversationListDto>> {
    try {
      const limit = query.limit ?? 25;
      const where: Prisma.ConversationWhereInput = {
        workspaceId: query.workspaceId,
        deletedAt: null,
        ...(query.status && { status: query.status as ConversationStatus }),
        ...(query.aiActive !== undefined && { aiActive: query.aiActive }),
        ...(query.assignedAgent && { takenOverBy: query.assignedAgent }),
      };

      const items = await this.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          workspaceId: true,
          leadId: true,
          channel: true,
          status: true,
          aiActive: true,
          escalationLevel: true,
          takenOverBy: true,
          createdAt: true,
          updatedAt: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
        ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      });

      const hasNext = items.length > limit;
      if (hasNext) items.pop();

      return {
        ok: true,
        value: {
          items: items.map((c) => ({
            id: c.id,
            workspaceId: c.workspaceId,
            leadId: c.leadId,
            channel: c.channel,
            status: c.status,
            aiActive: c.aiActive,
            escalationLevel: c.escalationLevel,
            takenOverBy: c.takenOverBy,
            lastMessageAt: c.messages[0]?.createdAt ?? null,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
          nextCursor: hasNext && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'ListConversationsHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
