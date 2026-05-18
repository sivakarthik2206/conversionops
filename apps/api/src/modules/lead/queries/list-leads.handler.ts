import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { Prisma, LeadStatus, LeadTier, LeadSource } from '@conversionops/db';
import { ListLeadsQuery, LeadListDto } from './list-leads.query';

@Injectable()
export class ListLeadsHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns cursor-paginated leads filtered by workspace. All filters require workspaceId.
   * @returns Result<LeadListDto> — never throws
   */
  async execute(query: ListLeadsQuery): Promise<Result<LeadListDto>> {
    try {
      const limit = query.limit ?? 25;
      const where: Prisma.LeadWhereInput = {
        workspaceId: query.workspaceId,
        deletedAt: null,
        ...(query.status && { status: query.status as LeadStatus }),
        ...(query.tier && { tier: query.tier as LeadTier }),
        ...(query.source && { source: query.source as LeadSource }),
        ...(query.assignedTo && { assignedWorkspaceUserId: query.assignedTo }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
          ],
        }),
      };

      const items = await this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          source: true,
          status: true,
          tier: true,
          score: true,
          name: true,
          phone: true,
          email: true,
          assignedWorkspaceUserId: true,
          createdAt: true,
          updatedAt: true,
        },
        ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      });

      const hasNext = items.length > limit;
      if (hasNext) items.pop();

      return {
        ok: true,
        value: {
          items,
          nextCursor: hasNext && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'ListLeadsHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
