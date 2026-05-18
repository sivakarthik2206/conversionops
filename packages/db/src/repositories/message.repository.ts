import { PrismaClient, Message, Prisma } from '@prisma/client';

export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds the last N messages for a conversation, scoped to workspaceId.
   */
  async findByConversationId(
    conversationId: string,
    workspaceId: string,
    limit = 50,
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId, workspaceId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Creates a new message.
   */
  async create(data: Prisma.MessageCreateInput): Promise<Message> {
    return this.prisma.message.create({ data });
  }
}
