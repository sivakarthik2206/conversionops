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

// Statuses from which we can transition to QUALIFIED (via the state machine)
const QUALIFIABLE_STATUSES = new Set<LeadStatus>([
  LeadStatus.QUALIFYING,
  LeadStatus.CONTACTED, // edge case: all fields answered in very first exchange
]);

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
   * Updates lead score/tier and transitions to QUALIFIED when all 7 fields are answered.
   *
   * BUG FIX #3: Previously checked lead.status === QUALIFYING only. Since ai-response now
   * properly advances the status, QUALIFYING is the normal case. CONTACTED is handled as an
   * edge case (all 7 fields answered in one exchange). Routing is only enqueued after
   * successfully transitioning through QUALIFIED → ROUTING (state machine enforced).
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
      where: { conversationId, workspaceId },
    });

    const qualification = (lead.qualification as QualificationData | null) ?? {};
    await updateLeadScore(leadId, workspaceId, qualification, messageCount, this.prisma);

    const score = calculateScore(qualification, messageCount);
    const tier = getTier(score);

    const answeredCount = FULLY_QUALIFIED_FIELDS.filter((f) => !!qualification[f]).length;
    const isFullyQualified = answeredCount >= FULLY_QUALIFIED_FIELDS.length;

    if (isFullyQualified && QUALIFIABLE_STATUSES.has(lead.status)) {
      await this.transitionToQualifiedAndRoute(leadId, workspaceId, lead.status, qualification, score, tier, conversationId);
    } else {
      await this.eventStore.append({
        leadId,
        workspaceId,
        type: 'lead.qualification.progressed',
        payload: { qualification, score, tier, answeredCount, conversationId },
        triggeredBy: 'qualification-processor',
      });

      logger.info({ leadId, workspaceId, score, tier, answeredCount, status: lead.status }, 'qualification: score updated');
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

  /**
   * Advances lead through QUALIFYING → QUALIFIED → ROUTING state transitions atomically.
   * If lead is in CONTACTED (edge case), transitions through QUALIFYING first.
   */
  private async transitionToQualifiedAndRoute(
    leadId: string,
    workspaceId: string,
    currentStatus: LeadStatus,
    qualification: QualificationData,
    score: number,
    tier: string,
    conversationId: string,
  ): Promise<void> {
    let statusForQualify = currentStatus;

    // Edge case: lead answered all fields from CONTACTED without explicit QUALIFYING transition
    if (currentStatus === LeadStatus.CONTACTED) {
      const qualifyingStatus = transitionLead(currentStatus, { type: 'QUALIFICATION_STARTED' }, { leadId, workspaceId });
      if (qualifyingStatus === LeadStatus.QUALIFYING) {
        statusForQualify = qualifyingStatus;
      }
    }

    const newStatus = transitionLead(statusForQualify, { type: 'QUALIFICATION_COMPLETED' }, { leadId, workspaceId });

    if (newStatus !== currentStatus) {
      await this.prisma.lead.update({
        where: { id: leadId, workspaceId },
        data: { status: newStatus, qualification: qualification as unknown as Prisma.InputJsonValue },
      });

      await this.eventStore.append({
        leadId,
        workspaceId,
        type: 'lead.qualification.completed',
        payload: { qualification, score, tier, conversationId },
        triggeredBy: 'qualification-processor',
      });

      // Enqueue lead routing — routing processor will transition QUALIFIED → ROUTING → ASSIGNED
      await queues.leadRouting
        .add('route-lead', { leadId, workspaceId }, { removeOnComplete: 500, priority: 2 })
        .catch((err: unknown) => logger.error({ err, leadId }, 'qualification: routing enqueue failed'));

      logger.info({ leadId, workspaceId, score, tier, previousStatus: currentStatus, newStatus }, 'qualification: fully qualified, routing enqueued');
    }
  }
}
