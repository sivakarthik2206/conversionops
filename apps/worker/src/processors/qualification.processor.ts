import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, EventStore, transitionLead } from '@conversionops/orchestration';
import type { QualificationJobData } from '@conversionops/orchestration';
import { updateLeadScore, getTier, calculateScore } from '@conversionops/ai';
import { LeadStatus, Prisma } from '@conversionops/db';
import type { QualificationData } from '@conversionops/ai';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RealtimeEmitterService } from '../modules/realtime/realtime-emitter.service';

const FULLY_QUALIFIED_FIELDS = ['budget', 'timeline', 'financing', 'area', 'propertyType', 'urgency', 'intent'] as const;

@Injectable()
export class QualificationProcessor {
  private readonly eventStore: EventStore;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Processes qualification jobs. Updates lead score/tier and transitions to QUALIFIED
   * when all 7 qualification fields are answered. Enqueues routing if qualified.
   */
  async process(job: Job<QualificationJobData>): Promise<void> {
    const { leadId, workspaceId, conversationId } = job.data;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, deletedAt: null },
    });

    if (!lead) {
      logger.warn({ leadId, workspaceId }, 'qualification: lead not found, skipping');
      return;
    }

    const messageCount = await this.prisma.message.count({
      where: { conversationId },
    });

    const qualification = (lead.qualification as QualificationData | null) ?? {};
    await updateLeadScore(leadId, workspaceId, qualification, this.prisma);

    const score = calculateScore(qualification, messageCount);
    const tier = getTier(score);

    const answeredCount = FULLY_QUALIFIED_FIELDS.filter((f) => !!qualification[f]).length;
    const isFullyQualified = answeredCount >= FULLY_QUALIFIED_FIELDS.length;

    if (isFullyQualified && lead.status === LeadStatus.QUALIFYING) {
      const newStatus = transitionLead(lead.status, { type: 'QUALIFICATION_COMPLETED' }, { leadId, workspaceId });

      if (newStatus !== lead.status) {
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { status: newStatus, qualification: qualification as Prisma.InputJsonValue },
        });

        await this.eventStore.append({
          leadId,
          workspaceId,
          type: 'lead.qualification.completed',
          payload: { qualification, score, tier, conversationId },
          triggerSource: 'qualification-processor',
        });

        await queues.leadRouting
          .add('route-lead', { leadId, workspaceId }, { removeOnComplete: 500, priority: 2 })
          .catch((err: unknown) => logger.error({ err, leadId }, 'qualification: routing enqueue failed'));

        logger.info({ leadId, workspaceId, score, tier }, 'qualification: fully qualified, routing enqueued');
      }
    } else {
      await this.eventStore.append({
        leadId,
        workspaceId,
        type: 'lead.qualification.progressed',
        payload: { qualification, score, tier, answeredCount, conversationId },
        triggerSource: 'qualification-processor',
      });

      logger.info({ leadId, workspaceId, score, tier, answeredCount }, 'qualification: score updated');
    }

    this.realtimeEmitter.emitToWorkspace(workspaceId, 'lead:scored', { leadId, score, tier });

    await queues.analyticsIngest
      .add('analytics-ingest', {
        leadId,
        workspaceId,
        event: 'lead.scored',
        metadata: { score, tier },
      }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'qualification: analytics enqueue failed'));
  }
}
