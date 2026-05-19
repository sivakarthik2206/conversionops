import { Injectable } from '@nestjs/common';
import { Prisma } from '@conversionops/db';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';

export interface GetResponseTimesQuery {
  workspaceId: string;
  from: Date;
  to: Date;
}

export interface ResponseTimeStats {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  byHour: number[];
  byDayOfWeek: number[];
  bySource: Record<string, number>;
}

interface RawPercentileRow {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

interface RawHourRow {
  hour: number;
  avg_ms: number;
}

interface RawDayRow {
  dow: number;
  avg_ms: number;
}

interface RawSourceRow {
  source: string;
  avg_ms: number;
}

@Injectable()
export class GetResponseTimesHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates AI response time percentiles (p50–p99) and breakdowns by hour, day, and source.
   * Joins AI messages with preceding human messages to compute time delta.
   */
  async execute(query: GetResponseTimesQuery): Promise<Result<ResponseTimeStats>> {
    try {
      const [percentileRows, hourRows, dayRows, sourceRows] = await Promise.all([
        this.prisma.$queryRaw<RawPercentileRow[]>(Prisma.sql`
          WITH response_deltas AS (
            SELECT
              EXTRACT(EPOCH FROM (ai.created_at - human.created_at)) * 1000 AS response_ms
            FROM messages ai
            JOIN messages human ON human.conversation_id = ai.conversation_id
              AND human.created_at < ai.created_at
              AND human.role = 'HUMAN'
            JOIN conversations c ON c.id = ai.conversation_id
            WHERE ai.workspace_id = ${query.workspaceId}
              AND ai.role = 'AI'
              AND ai.deleted_at IS NULL
              AND ai.created_at BETWEEN ${query.from} AND ${query.to}
              AND human.created_at = (
                SELECT MAX(m2.created_at) FROM messages m2
                WHERE m2.conversation_id = ai.conversation_id
                  AND m2.created_at < ai.created_at
                  AND m2.role = 'HUMAN'
                  AND m2.deleted_at IS NULL
              )
          )
          SELECT
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_ms) AS p50,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY response_ms) AS p75,
            PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY response_ms) AS p90,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_ms) AS p95,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_ms) AS p99
          FROM response_deltas
        `),
        this.prisma.$queryRaw<RawHourRow[]>(Prisma.sql`
          WITH response_deltas AS (
            SELECT
              EXTRACT(HOUR FROM ai.created_at AT TIME ZONE 'UTC') AS hour,
              EXTRACT(EPOCH FROM (ai.created_at - human.created_at)) * 1000 AS response_ms
            FROM messages ai
            JOIN messages human ON human.conversation_id = ai.conversation_id
              AND human.role = 'HUMAN'
            JOIN conversations c ON c.id = ai.conversation_id
            WHERE ai.workspace_id = ${query.workspaceId}
              AND ai.role = 'AI'
              AND ai.deleted_at IS NULL
              AND ai.created_at BETWEEN ${query.from} AND ${query.to}
              AND human.created_at = (
                SELECT MAX(m2.created_at) FROM messages m2
                WHERE m2.conversation_id = ai.conversation_id
                  AND m2.created_at < ai.created_at
                  AND m2.role = 'HUMAN'
                  AND m2.deleted_at IS NULL
              )
          )
          SELECT hour::int AS hour, AVG(response_ms) AS avg_ms
          FROM response_deltas
          GROUP BY hour
          ORDER BY hour
        `),
        this.prisma.$queryRaw<RawDayRow[]>(Prisma.sql`
          WITH response_deltas AS (
            SELECT
              EXTRACT(DOW FROM ai.created_at AT TIME ZONE 'UTC') AS dow,
              EXTRACT(EPOCH FROM (ai.created_at - human.created_at)) * 1000 AS response_ms
            FROM messages ai
            JOIN messages human ON human.conversation_id = ai.conversation_id
              AND human.role = 'HUMAN'
            JOIN conversations c ON c.id = ai.conversation_id
            WHERE ai.workspace_id = ${query.workspaceId}
              AND ai.role = 'AI'
              AND ai.deleted_at IS NULL
              AND ai.created_at BETWEEN ${query.from} AND ${query.to}
              AND human.created_at = (
                SELECT MAX(m2.created_at) FROM messages m2
                WHERE m2.conversation_id = ai.conversation_id
                  AND m2.created_at < ai.created_at
                  AND m2.role = 'HUMAN'
                  AND m2.deleted_at IS NULL
              )
          )
          SELECT dow::int AS dow, AVG(response_ms) AS avg_ms
          FROM response_deltas
          GROUP BY dow
          ORDER BY dow
        `),
        this.prisma.$queryRaw<RawSourceRow[]>(Prisma.sql`
          WITH response_deltas AS (
            SELECT
              l.source,
              EXTRACT(EPOCH FROM (ai.created_at - human.created_at)) * 1000 AS response_ms
            FROM messages ai
            JOIN conversations c ON c.id = ai.conversation_id
            JOIN leads l ON l.id = c.lead_id AND l.workspace_id = ${query.workspaceId}
            JOIN messages human ON human.conversation_id = ai.conversation_id
              AND human.role = 'HUMAN'
            WHERE ai.workspace_id = ${query.workspaceId}
              AND ai.role = 'AI'
              AND ai.deleted_at IS NULL
              AND ai.created_at BETWEEN ${query.from} AND ${query.to}
              AND human.created_at = (
                SELECT MAX(m2.created_at) FROM messages m2
                WHERE m2.conversation_id = ai.conversation_id
                  AND m2.created_at < ai.created_at
                  AND m2.role = 'HUMAN'
                  AND m2.deleted_at IS NULL
              )
          )
          SELECT source, AVG(response_ms) AS avg_ms
          FROM response_deltas
          GROUP BY source
        `),
      ]);

      const p = percentileRows[0] ?? { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };

      const byHour = Array.from({ length: 24 }, (_, i) => {
        const row = hourRows.find((r) => r.hour === i);
        return row ? Math.round(row.avg_ms) : 0;
      });

      const byDayOfWeek = Array.from({ length: 7 }, (_, i) => {
        const row = dayRows.find((r) => r.dow === i);
        return row ? Math.round(row.avg_ms) : 0;
      });

      const bySource: Record<string, number> = {};
      for (const row of sourceRows) {
        bySource[row.source] = Math.round(row.avg_ms);
      }

      return {
        ok: true,
        value: {
          p50: Math.round(Number(p.p50) || 0),
          p75: Math.round(Number(p.p75) || 0),
          p90: Math.round(Number(p.p90) || 0),
          p95: Math.round(Number(p.p95) || 0),
          p99: Math.round(Number(p.p99) || 0),
          byHour,
          byDayOfWeek,
          bySource,
        },
      };
    } catch (err) {
      logger.error({ err, workspaceId: query.workspaceId }, 'analytics: get-response-times failed');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
