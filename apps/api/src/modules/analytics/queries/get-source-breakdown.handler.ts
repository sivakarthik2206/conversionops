import { Injectable } from '@nestjs/common';
import { Prisma } from '@conversionops/db';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';

export interface GetSourceBreakdownQuery {
  workspaceId: string;
  from: Date;
  to: Date;
}

export interface SourceBreakdown {
  source: string;
  total: number;
  qualified: number;
  booked: number;
  converted: number;
  qualifiedRate: number;
  bookedRate: number;
  convertedRate: number;
}

interface RawSourceRow {
  source: string;
  total: bigint;
  qualified: bigint;
  booked: bigint;
  converted: bigint;
}

@Injectable()
export class GetSourceBreakdownHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns per-source conversion funnel stats using raw SQL.
   * workspaceId scoped — uses Prisma.sql template literals only.
   */
  async execute(query: GetSourceBreakdownQuery): Promise<Result<SourceBreakdown[]>> {
    try {
      const rows = await this.prisma.$queryRaw<RawSourceRow[]>(Prisma.sql`
        SELECT
          l.source,
          COUNT(*) AS total,
          COUNT(*) FILTER (
            WHERE l.status IN ('QUALIFIED', 'ROUTING', 'ASSIGNED', 'APPOINTMENT_REQUESTED',
                               'APPOINTMENT_SCHEDULED', 'CONVERTED')
          ) AS qualified,
          COUNT(*) FILTER (
            WHERE l.status IN ('APPOINTMENT_SCHEDULED', 'CONVERTED')
          ) AS booked,
          COUNT(*) FILTER (
            WHERE l.status = 'CONVERTED'
          ) AS converted
        FROM leads l
        WHERE l.workspace_id = ${query.workspaceId}
          AND l.deleted_at IS NULL
          AND l.created_at BETWEEN ${query.from} AND ${query.to}
        GROUP BY l.source
        ORDER BY COUNT(*) DESC
      `);

      const breakdown: SourceBreakdown[] = rows.map((row) => {
        const total = Number(row.total);
        const qualified = Number(row.qualified);
        const booked = Number(row.booked);
        const converted = Number(row.converted);

        return {
          source: row.source,
          total,
          qualified,
          booked,
          converted,
          qualifiedRate: total > 0 ? Math.round((qualified / total) * 10000) / 100 : 0,
          bookedRate: total > 0 ? Math.round((booked / total) * 10000) / 100 : 0,
          convertedRate: total > 0 ? Math.round((converted / total) * 10000) / 100 : 0,
        };
      });

      return { ok: true, value: breakdown };
    } catch (err) {
      logger.error({ err, workspaceId: query.workspaceId }, 'analytics: get-source-breakdown failed');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
