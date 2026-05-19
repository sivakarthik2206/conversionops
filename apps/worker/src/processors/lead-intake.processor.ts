import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, EventStore } from '@conversionops/orchestration';
import type { LeadIntakeJobData } from '@conversionops/orchestration';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class LeadIntakeProcessor {
  private readonly eventStore: EventStore;

  constructor(private readonly prisma: PrismaService) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Processes lead-intake jobs. Creates the Lead record if not a duplicate,
   * appends the lead.created event, and enqueues downstream jobs.
   */
  async process(job: Job<LeadIntakeJobData>): Promise<void> {
    const { leadId, workspaceId } = job.data;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, deletedAt: null },
    });

    if (!lead) {
      logger.warn({ leadId, workspaceId }, 'lead-intake: lead not found, skipping');
      return;
    }

    if (lead.externalId) {
      const duplicate = await this.prisma.lead.findFirst({
        where: {
          workspaceId,
          externalId: lead.externalId,
          deletedAt: null,
          NOT: { id: leadId },
        },
      });
      if (duplicate) {
        logger.info({ leadId, externalId: lead.externalId, workspaceId }, 'lead-intake: duplicate externalId, skipping');
        return;
      }
    }

    const existingEvent = await this.prisma.leadEvent.findFirst({
      where: { leadId, type: 'lead.created' },
    });

    if (!existingEvent) {
      await this.eventStore.append({
        leadId,
        workspaceId,
        type: 'lead.created',
        payload: { source: lead.source },
        triggerSource: 'lead-intake-processor',
      });
    }

    await queues.aiResponse
      .add('ai-response', { leadId, workspaceId }, { removeOnComplete: 500, priority: 2 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'lead-intake: ai-response enqueue failed'));

    await queues.analyticsIngest
      .add('analytics-ingest', { leadId, workspaceId, event: 'lead.created' }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'lead-intake: analytics-ingest enqueue failed'));

    logger.info({ leadId, workspaceId }, 'lead-intake: processed successfully');
  }
}
