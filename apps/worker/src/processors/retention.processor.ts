import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues } from '@conversionops/orchestration';
import { enforceRetentionPolicies } from '@conversionops/compliance';
import { NotificationType } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class RetentionProcessor {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs nightly data retention policies. Scheduled at 3am UTC via BullMQ repeat job.
   * Never throws — log errors and continue.
   */
  async process(_job: Job): Promise<void> {
    try {
      logger.info('retention: starting nightly retention run');
      const report = await enforceRetentionPolicies(this.prisma);

      await queues.notification
        .add(
          'retention-report',
          {
            type: NotificationType.OPS_ALERT,
            payload: {
              message: `Nightly retention complete: ${report.purgedIdempotencyKeys} idempotency keys purged, ${report.anonymisedLeads} leads anonymised`,
              report,
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
}
