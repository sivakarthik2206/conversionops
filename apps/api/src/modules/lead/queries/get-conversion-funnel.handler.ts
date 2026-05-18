import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { GetConversionFunnelQuery, ConversionFunnelDto } from './get-conversion-funnel.query';

const FUNNEL_ORDER = [
  'NEW', 'CONTACTED', 'QUALIFYING', 'QUALIFIED', 'ROUTING',
  'ASSIGNED', 'APPOINTMENT_REQUESTED', 'APPOINTMENT_SCHEDULED', 'CONVERTED',
];

@Injectable()
export class GetConversionFunnelHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns lead counts per status using raw SQL, scoped to workspaceId.
   * @returns Result<ConversionFunnelDto> — never throws
   */
  async execute(query: GetConversionFunnelQuery): Promise<Result<ConversionFunnelDto>> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
        SELECT status, COUNT(*)::bigint as count
        FROM "Lead"
        WHERE "workspaceId" = ${query.workspaceId}
          AND "deletedAt" IS NULL
        GROUP BY status
      `;

      const countMap = new Map<string, number>(
        rows.map((r) => [r.status, Number(r.count)]),
      );

      const totalLeads = [...countMap.values()].reduce((a, b) => a + b, 0);
      const topOfFunnel = countMap.get('NEW') ?? totalLeads;

      const stages = FUNNEL_ORDER.map((status) => {
        const count = countMap.get(status) ?? 0;
        return {
          status,
          count,
          conversionRate: topOfFunnel > 0 ? Math.round((count / topOfFunnel) * 100) : 0,
        };
      });

      return { ok: true, value: { stages, totalLeads } };
    } catch (error) {
      logger.error({ err: error }, 'GetConversionFunnelHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
