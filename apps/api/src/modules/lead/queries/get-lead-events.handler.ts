import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import { GetLeadEventsQuery, LeadEventDto } from './get-lead-events.query';

@Injectable()
export class GetLeadEventsHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the ordered event history for a lead, scoped to the workspace.
   * Returns TenantLeakageError if the lead doesn't belong to this workspace.
   */
  async execute(query: GetLeadEventsQuery): Promise<Result<LeadEventDto[]>> {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id: query.leadId, workspaceId: query.workspaceId, deletedAt: null },
        select: { id: true },
      });

      if (!lead) {
        return { ok: false, error: new TenantLeakageError(query.leadId, query.workspaceId) };
      }

      const events = await this.prisma.leadEvent.findMany({
        where: { leadId: query.leadId, workspaceId: query.workspaceId },
        orderBy: { sequence: 'asc' },
        select: {
          id: true,
          type: true,
          payload: true,
          triggeredBy: true,
          occurredAt: true,
          sequence: true,
        },
      });

      return {
        ok: true,
        value: events.map(e => ({
          id: e.id,
          type: e.type,
          payload: (e.payload as Record<string, unknown>) ?? {},
          triggeredBy: e.triggeredBy,
          occurredAt: e.occurredAt.toISOString(),
          sequence: e.sequence,
        })),
      };
    } catch (error) {
      logger.error({ err: error, leadId: query.leadId }, 'GetLeadEventsHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
