import { PrismaClient, Message, MessageRole, Prisma } from '@prisma/client';

export interface CreateMessageInput {
  conversationId: string;
  workspaceId: string;
  role: MessageRole;
  content: string;
  aiMetadata?: Prisma.InputJsonValue;
  providerMessageId?: string;
}

export interface MessagePage {
  items: Message[];
  nextCursor: string | null;
}

export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Cursor-based paginated messages for a conversation, scoped to workspaceId via join.
   * Returns messages in ascending createdAt order (oldest first).
   */
  async findByConversationId(
    conversationId: string,
    workspaceId: string,
    limit = 25,
    cursor?: string,
  ): Promise<MessagePage> {
    const items = await this.prisma.message.findMany({
      where: {
        conversationId,
        workspaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = items.length > limit;
    if (hasNext) items.pop();

    return {
      items,
      nextCursor: hasNext && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Creates an immutable message record.
   */
  async create(data: CreateMessageInput): Promise<Message> {
    return this.prisma.message.create({ data });
  }

  /**
   * Returns the last N messages for a conversation, in ascending createdAt order.
   * Used to build AI context windows.
   */
  async findLatestByConversation(
    conversationId: string,
    workspaceId: string,
    count: number,
  ): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: count,
    });
    return messages.reverse();
  }

  /**
   * Counts all messages for a conversation. Used for memory summarisation trigger.
   */
  async countByConversation(conversationId: string, workspaceId: string): Promise<number> {
    return this.prisma.message.count({
      where: { conversationId, workspaceId, deletedAt: null },
    });
  }

  /**
   * Soft-deletes all messages in a conversation (CCPA anonymisation).
   * Replaces content with '[PII DELETED]'.
   */
  async anonymiseByConversation(conversationId: string, workspaceId: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: { conversationId, workspaceId },
      data: { content: '[PII DELETED]', deletedAt: new Date() },
    });
  }
}
