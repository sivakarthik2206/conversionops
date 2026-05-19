import { Injectable } from '@nestjs/common';
import { Prisma } from '@conversionops/db';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';

export interface GetFunnelQuery {
  workspaceId: string;
  from: Date;
  to: Date;
  agentId?: string;
}

export interface FunnelStage {
  status: string;
  count: number;
  conversionRate: number;
  avgHoursInStage: number;
}

interface RawFunnelRow {
  status: string;
  count: bigint;
  avg_hours: number | null;
}

@Injectable()
export class GetFunnelHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns lead counts, conversion rates, and average time-in-stage per status.
   * Uses raw SQL via Prisma.sql — never string concatenation.
   */
  async execute(query: GetFunnelQuery): Promise<Result<FunnelStage[]>> {
    try {
      const rows = await this.prisma.$queryRaw<RawFunnelRow[]>(Prisma.sql`
        WITH stage_times AS (
          SELECT
            l.status,
            l.id AS lead_id,
            EXTRACT(EPOCH FROM (
              COALESCE(
                (SELECT MIN(le2.occurred_at) FROM lead_events le2
                 WHERE le2.lead_id = l.id AND le2.workspace_id = ${query.workspaceId}
                   AND le2.occurred_at > le.occurred_at),
                NOW()
              ) - le.occurred_at
            )) / 3600.0 AS hours_in_stage
          FROM leads l
          JOIN lead_events le ON le.lead_id = l.id AND le.workspace_id = ${query.workspaceId}
          WHERE l.workspace_id = ${query.workspaceId}
            AND l.deleted_at IS NULL
            AND l.created_at BETWEEN ${query.from} AND ${query.to}
            ${query.agentId ? Prisma.sql`AND l.assigned_to_id = ${query.agentId}` : Prisma.sql``}
        )
        SELECT
          l.status,
          COUNT(DISTINCT l.id) AS count,
          AVG(st.hours_in_stage) AS avg_hours
        FROM leads l
        LEFT JOIN stage_times st ON st.lead_id = l.id AND st.status = l.status
        WHERE l.workspace_id = ${query.workspaceId}
          AND l.deleted_at IS NULL
          AND l.created_at BETWEEN ${query.from} AND ${query.to}
          ${query.agentId ? Prisma.sql`AND l.assigned_to_id = ${query.agentId}` : Prisma.sql``}
        GROUP BY l.status
        ORDER BY COUNT(DISTINCT l.id) DESC
      `);

      const statusOrder = [
        'NEW', 'CONTACTED', 'QUALIFYING', 'QUALIFIED', 'ROUTING',
        'ASSIGNED', 'APPOINTMENT_REQUESTED', 'APPOINTMENT_SCHEDULED', 'CONVERTED',
      ];

      const countMap = new Map<string, number>();
      for (const row of rows) {
        countMap.set(row.status, Number(row.count));
      }

      const stages: FunnelStage[] = rows.map((row) => ({
        status: row.status,
        count: Number(row.count),
        conversionRate: 0,
        avgHoursInStage: row.avg_hours != null ? Math.round(row.avg_hours * 100) / 100 : 0,
      }));

      // Calculate conversion rate: count / previous_stage_count (in statusOrder)
      const orderedStages = statusOrder
        .map((status) => stages.find((s) => s.status === status))
        .filter((s): s is FunnelStage => s !== undefined);

      // Append any statuses not in the ordered list
      const unordered = stages.filter((s) => !statusOrder.includes(s.status));
      const allStages = [...orderedStages, ...unordered];

      const totalNew = countMap.get('NEW') ?? (allStages[0]?.count ?? 0);

      for (const stage of allStages) {
        stage.conversionRate = totalNew > 0
          ? Math.round((stage.count / totalNew) * 10000) / 100
          : 0;
      }

      return { ok: true, value: allStages };
    } catch (err) {
      logger.error({ err, workspaceId: query.workspaceId }, 'analytics: get-funnel failed');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
