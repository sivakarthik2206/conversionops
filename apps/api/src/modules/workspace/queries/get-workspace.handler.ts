import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { GetWorkspaceQuery, WorkspaceDto } from './get-workspace.query';

@Injectable()
export class GetWorkspaceHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns workspace with agent count and token usage percentage.
   * @returns Result<WorkspaceDto> — never throws
   */
  async execute(query: GetWorkspaceQuery): Promise<Result<WorkspaceDto>> {
    try {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: query.workspaceId, deletedAt: null },
        include: {
          _count: { select: { users: { where: { isActive: true } } } },
        },
      });

      if (!workspace) {
        return { ok: false, error: new Error('Workspace not found') };
      }

      const tokenUsagePercent =
        workspace.tokenQuotaMonthly > 0
          ? Math.round((workspace.tokenUsageCurrentMonth / workspace.tokenQuotaMonthly) * 100)
          : 0;

      return {
        ok: true,
        value: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          plan: workspace.plan,
          status: workspace.status,
          timezone: workspace.timezone,
          aiPaused: workspace.aiPaused,
          tokenUsageCurrentMonth: workspace.tokenUsageCurrentMonth,
          tokenQuotaMonthly: workspace.tokenQuotaMonthly,
          tokenUsagePercent,
          agentCount: workspace._count.users,
          onboardingStep: workspace.onboardingStep,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
        },
      };
    } catch (error) {
      logger.error({ err: error, workspaceId: query.workspaceId }, 'GetWorkspaceHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
