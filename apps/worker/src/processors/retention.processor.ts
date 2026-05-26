import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, transitionLead } from '@conversionops/orchestration';
import { enforceRetentionPolicies } from '@conversionops/compliance';
import { NotificationType, LeadStatus } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';

const DORMANCY_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class RetentionProcessor {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs nightly data retention policies. Scheduled at 3am UTC via BullMQ repeat job.
   * Also marks UNRESPONSIVE leads dormant after 30 days of inactivity.
   * Never throws — log errors and continue.
   */
  async process(_job: Job): Promise<void> {
    try {
      logger.info('retention: starting nightly retention run');
      const report = await enforceRetentionPolicies(this.prisma);
      const dormantCount = await this.markDormantLeads();

      await queues.notification
        .add(
          'retention-report',
          {
            type: NotificationType.OPS_ALERT,
            payload: {
              message: `Nightly retention complete: ${report.purgedIdempotencyKeys} idempotency keys purged, ${report.anonymisedLeads} leads anonymised, ${dormantCount} leads marked dormant`,
              report,
              dormantCount,
            },
            isOpsAlert: true,
            opsAlertLevel: 'info',
          },
          { removeOnComplete: 100 },
        )
        .catch((err: unknown) =>
          logger.warn({ err }, 'retention: ops notification enqueue failed'),
        );
    } catch (err: unknown) {
      logger.error({ err }, 'retention: unexpected error in retention processor');
    }
  }

  /**
   * Finds UNRESPONSIVE leads that have had no activity for 30+ days and transitions
   * them to DORMANT via the XState machine. Processes in batches to avoid OOM.
   */
  private async markDormantLeads(): Promise<number> {
    const cutoff = new Date(Date.now() - DORMANCY_THRESHOLD_MS);
    let marked = 0;
    let cursor: string | undefined;

    for (;;) {
      const batch = await this.prisma.lead.findMany({
        where: {
          status: LeadStatus.UNRESPONSIVE,
          updatedAt: { lt: cutoff },
          deletedAt: null,
        },
        select: { id: true, workspaceId: true, status: true },
        take: 100,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });

      if (batch.length === 0) break;

      for (const lead of batch) {
        const newStatus = transitionLead(lead.status, { type: 'MARK_DORMANT' }, { leadId: lead.id, workspaceId: lead.workspaceId });
        if (newStatus !== lead.status) {
          await this.prisma.lead.update({
            where: { id: lead.id, workspaceId: lead.workspaceId },
            data: { status: newStatus },
          }).catch((err: unknown) => logger.warn({ err, leadId: lead.id }, 'retention: failed to mark lead dormant'));
          marked++;
        }
      }

      if (batch.length < 100) break;
      cursor = batch[batch.length - 1]!.id;
    }

    logger.info({ marked }, 'retention: dormancy sweep complete');
    return marked;
  }
}
