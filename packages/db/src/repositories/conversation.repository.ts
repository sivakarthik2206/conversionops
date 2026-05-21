import {
  PrismaClient,
  Conversation,
  ConversationStatus,
  Prisma,
} from '@prisma/client';

export interface ListConversationsFilters {
  workspaceId: string;
  status?: ConversationStatus;
  aiActive?: boolean;
  assignedAgent?: string;
  cursor?: string;
  limit?: number;
}

export interface ConversationPage {
  items: Conversation[];
  nextCursor: string | null;
}

export class ConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds a conversation by id, scoped to workspaceId.
   */
  async findById(id: string, workspaceId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  /**
   * Finds all conversations for a lead, scoped to workspaceId.
   */
  async findByLeadId(leadId: string, workspaceId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: { leadId, workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cursor-based paginated conversation list. workspaceId required.
   */
  async findMany(filters: ListConversationsFilters): Promise<ConversationPage> {
    const limit = filters.limit ?? 25;
    const where: Prisma.ConversationWhereInput = {
      workspaceId: filters.workspaceId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.aiActive !== undefined && { aiActive: filters.aiActive }),
      ...(filters.assignedAgent && { takenOverBy: filters.assignedAgent }),
    };

    const items = await this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
    });

    const hasNext = items.length > limit;
    if (hasNext) items.pop();

    return {
      items,
      nextCursor: hasNext && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Creates a new conversation.
   */
  async create(data: Prisma.ConversationCreateInput): Promise<Conversation> {
    return this.prisma.conversation.create({ data });
  }

  /**
   * Updates a conversation, scoped to workspaceId.
   */
  async update(
    id: string,
    workspaceId: string,
    data: Prisma.ConversationUpdateInput,
  ): Promise<Conversation | null> {
    // updateMany with (id, workspaceId) predicate — race-safe vs. find-then-update.
    const result = await this.prisma.conversation.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: data as Prisma.ConversationUncheckedUpdateManyInput,
    });
    if (result.count === 0) return null;
    return this.findById(id, workspaceId);
  }
}
