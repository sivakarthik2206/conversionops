import { PrismaClient, Lead, LeadStatus, LeadTier, LeadSource, Prisma } from '@prisma/client';

export interface ListLeadsFilters {
  workspaceId: string;
  status?: LeadStatus;
  tier?: LeadTier;
  source?: LeadSource;
  assignedTo?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface LeadPage {
  items: Lead[];
  nextCursor: string | null;
}

export class LeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds a lead by id, scoped to workspaceId.
   */
  async findById(id: string, workspaceId: string): Promise<Lead | null> {
    return this.prisma.lead.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  /**
   * Cursor-based paginated lead list. workspaceId is required on every query.
   */
  async findMany(filters: ListLeadsFilters): Promise<LeadPage> {
    const limit = filters.limit ?? 25;
    const where: Prisma.LeadWhereInput = {
      workspaceId: filters.workspaceId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.tier && { tier: filters.tier }),
      ...(filters.source && { source: filters.source }),
      ...(filters.assignedTo && { assignedWorkspaceUserId: filters.assignedTo }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
        ],
      }),
    };

    const items = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
   * Creates a new lead. workspaceId is always included in create input.
   */
  async create(data: Prisma.LeadCreateInput): Promise<Lead> {
    return this.prisma.lead.create({ data });
  }

  /**
   * Updates a lead, scoped to workspaceId.
   */
  async update(
    id: string,
    workspaceId: string,
    data: Prisma.LeadUpdateInput,
  ): Promise<Lead | null> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) return null;
    return this.prisma.lead.update({ where: { id }, data });
  }

  /**
   * Soft-deletes a lead. Never hard deletes.
   */
  async softDelete(id: string, workspaceId: string): Promise<Lead | null> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) return null;
    return this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Counts leads per status for a workspace (used in analytics).
   */
  async countByStatus(workspaceId: string): Promise<Record<string, number>> {
    const rows = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { workspaceId, deletedAt: null },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  }
}
