import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import { GetLeadQuery, LeadDetailDto } from './get-lead.query';

@Injectable()
export class GetLeadHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns lead detail with latest conversation and assignment history.
   * Always scoped by workspaceId.
   * @returns Result<LeadDetailDto> — never throws
   */
  async execute(query: GetLeadQuery): Promise<Result<LeadDetailDto>> {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id: query.leadId, workspaceId: query.workspaceId, deletedAt: null },
        include: {
          conversations: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true },
          },
          assignments: {
            orderBy: { assignedAt: 'desc' },
            select: {
              id: true,
              workspaceUserId: true,
              isPrimary: true,
              routingReason: true,
              assignedAt: true,
            },
          },
        },
      });

      if (!lead) {
        return { ok: false, error: new TenantLeakageError(query.leadId, query.workspaceId) };
      }

      return {
        ok: true,
        value: {
          id: lead.id,
          workspaceId: lead.workspaceId,
          source: lead.source,
          status: lead.status,
          tier: lead.tier,
          score: lead.score,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          externalId: lead.externalId,
          qualification: lead.qualification,
          assignedWorkspaceUserId: lead.assignedWorkspaceUserId,
          reactivationCount: lead.reactivationCount,
          aiPausedForLead: lead.aiPausedForLead,
          latestConversationId: lead.conversations[0]?.id ?? null,
          assignmentHistory: lead.assignments,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        },
      };
    } catch (error) {
      logger.error({ err: error, leadId: query.leadId }, 'GetLeadHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
