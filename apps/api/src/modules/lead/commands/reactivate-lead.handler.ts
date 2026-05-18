import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Lead } from '@conversionops/db';
import { ReactivateLeadCommand } from './reactivate-lead.command';

const MAX_REACTIVATIONS = 3;

@Injectable()
export class ReactivateLeadHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reactivates a dormant lead. Checks reactivation limit and consent.
   * @returns Result<Lead> — never throws
   */
  async execute(cmd: ReactivateLeadCommand): Promise<Result<Lead>> {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id: cmd.leadId, workspaceId: cmd.workspaceId, deletedAt: null },
      });
      if (!lead) {
        return { ok: false, error: new TenantLeakageError(cmd.leadId, cmd.workspaceId) };
      }

      if (lead.reactivationCount >= MAX_REACTIVATIONS) {
        return { ok: false, error: new Error(`Lead has reached max reactivations (${MAX_REACTIVATIONS})`) };
      }

      const consent = await this.prisma.consentRecord.findFirst({
        where: {
          workspaceId: cmd.workspaceId,
          leadId: cmd.leadId,
          status: 'OPTED_IN',
          deletedAt: null,
        },
      });
      if (!consent) {
        return { ok: false, error: new Error('No OPTED_IN consent record — cannot reactivate') };
      }

      const updated = await this.prisma.lead.update({
        where: { id: cmd.leadId },
        data: {
          status: 'REACTIVATED',
          reactivationCount: { increment: 1 },
          lastReactivatedAt: new Date(),
          reactivationSource: 'MANUAL',
        },
      });

      await queues.reactivation
        .add(
          'reactivate-lead',
          { leadId: cmd.leadId, workspaceId: cmd.workspaceId },
          { removeOnComplete: 500, priority: 2 },
        )
        .catch((err: unknown) => logger.error({ err }, 'reactivation enqueue failed'));

      await queues.auditLog
        .add(
          'lead.reactivated',
          {
            workspaceId: cmd.workspaceId,
            userId: cmd.reactivatedByUserId,
            action: 'lead.reactivated',
            resource: 'lead',
            resourceId: cmd.leadId,
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'ReactivateLeadHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
