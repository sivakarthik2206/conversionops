import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHash } from 'crypto';
import { logger } from '@conversionops/observability';
import { queues, EventStore, transitionLead } from '@conversionops/orchestration';
import type { AiResponseJobData } from '@conversionops/orchestration';
import type { EvalJobData } from '@conversionops/ai';
import { MessageRole, LeadStatus, NotificationType } from '@conversionops/db';
import type { Prisma } from '@conversionops/db';
import { isQuietHours, isOptOutKeyword } from '@conversionops/compliance';
import { checkFairHousing } from '@conversionops/compliance';
import { VertexAIClient, runQualificationChain, checkQuota, trackUsage, runEvals } from '@conversionops/ai';
import { NotificationService } from '@conversionops/orchestration';
import { TwilioClient } from '@conversionops/integrations';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RealtimeEmitterService } from '../modules/realtime/realtime-emitter.service';

interface AIMessageMetadata {
  promptVersion: string;
  promptHash: string;
  modelVersion: string;
  chainVersion: string;
  policyVersion: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  temperature: number;
  tcpaChecked: boolean;
  fairHousingChecked: boolean;
  quietHoursApplied: boolean;
  evalScores?: Record<string, number>;
}

const PROMPT_VERSION = 'qualification-v2.3.1';
const CHAIN_VERSION = 'qualification-chain-v1.2.0';
const POLICY_VERSION = 'fair-housing-policy-v1.0.0';

@Injectable()
export class AiResponseProcessor {
  private readonly vertexClient: VertexAIClient;
  private readonly notificationService: NotificationService;
  private readonly eventStore: EventStore;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {
    this.vertexClient = new VertexAIClient();
    this.notificationService = new NotificationService(queues.notification);
    this.eventStore = new EventStore(prisma);
  }

  /**
   * 7-step AI response pipeline. Pre-send checklist enforces TCPA, quota, and FHA compliance.
   * Persists qualification data and advances the XState lead lifecycle machine after each response.
   * SMS is only sent after the message record is persisted (never before).
   */
  async process(job: Job<AiResponseJobData>): Promise<void> {
    const { leadId, workspaceId, conversationId } = job.data;

    const [lead, workspace, conversation] = await Promise.all([
      this.prisma.lead.findFirst({ where: { id: leadId, workspaceId, deletedAt: null } }),
      this.prisma.workspace.findUnique({ where: { id: workspaceId } }),
      this.prisma.conversation.findFirst({ where: { id: conversationId, workspaceId, deletedAt: null } }),
    ]);

    if (!lead || !workspace || !conversation) {
      logger.warn({ leadId, workspaceId, conversationId }, 'ai-response: missing required records, skipping');
      return;
    }

    // Step 1: Check AI is allowed for this workspace + conversation
    if (workspace.aiPaused) {
      logger.info({ workspaceId, leadId }, 'ai-response: workspace AI paused, skipping');
      return;
    }
    if (!conversation.aiActive) {
      logger.info({ conversationId, leadId }, 'ai-response: conversation AI not active, skipping');
      return;
    }
    if (lead.aiPausedForLead) {
      logger.info({ leadId, workspaceId }, 'ai-response: AI paused for this lead, skipping');
      return;
    }

    // Step 2: Check opt-out on last inbound message (TCPA)
    const lastInbound = await this.prisma.message.findFirst({
      where: { conversationId, workspaceId, role: MessageRole.HUMAN },
      orderBy: { createdAt: 'desc' },
    });

    if (lastInbound && isOptOutKeyword(lastInbound.content)) {
      logger.info({ leadId, workspaceId }, 'ai-response: opt-out keyword detected');
      return;
    }

    // Step 3: Check quiet hours (TCPA)
    if (isQuietHours(workspace.timezone)) {
      logger.info({ workspaceId, leadId, timezone: workspace.timezone }, 'ai-response: quiet hours');
      return;
    }

    // Step 4: Check token quota
    const quotaStatus = await checkQuota(workspaceId, this.prisma);
    if (!quotaStatus.allowed) {
      logger.warn({ workspaceId, leadId, used: quotaStatus.used }, 'ai-response: quota exceeded');
      void this.notificationService.notifyWorkspace(workspaceId, NotificationType.QUOTA_WARNING, {
        percentUsed: quotaStatus.percentUsed,
      });
      return;
    }

    // Count prior AI messages BEFORE generation — used for state machine advancement below
    const priorAiMessageCount = await this.prisma.message.count({
      where: { conversationId, workspaceId, role: MessageRole.AI },
    });

    // Generate AI response (includes qualification data extraction)
    const startMs = Date.now();
    const chainResult = await runQualificationChain(conversationId, workspace, lead, this.vertexClient, this.prisma);

    if (!chainResult.ok) {
      logger.error({ err: chainResult.error, leadId, workspaceId }, 'ai-response: chain failed');
      return;
    }

    // BUG FIX #1: Extract ALL fields from chain result — updatedQualification and shouldBook were previously ignored
    const { content, inputTokens, outputTokens, latencyMs, updatedQualification, shouldBook } = chainResult.value;

    // Step 5: Fair Housing check
    const fhaResult = checkFairHousing(content);
    if (!fhaResult.passed && fhaResult.severity === 'block') {
      logger.error({ leadId, flaggedPatterns: fhaResult.flaggedPatterns }, 'ai-response: FHA violation blocked');
      // Escalate conversation so an agent knows to respond manually
      await this.prisma.conversation.update({
        where: { id: conversationId, workspaceId },
        data: { escalationLevel: 'URGENT', aiActive: false },
      });
      void this.notificationService.notifyWorkspace(workspaceId, NotificationType.AI_ESCALATION, {
        leadId,
        conversationId,
        reason: 'AI response blocked by Fair Housing filter — manual response required',
      });
      this.realtimeEmitter.emitToWorkspace(workspaceId, 'conversation:escalated', {
        conversationId,
        escalationLevel: 'URGENT',
        reason: 'AI response blocked (FHA compliance)',
      });
      return;
    }

    const promptHash = createHash('sha256').update(content).digest('hex').slice(0, 16);
    const modelVersion = process.env['VERTEX_AI_MODEL'] ?? 'gemini-1.5-flash-001';

    const aiMetadata: AIMessageMetadata = {
      promptVersion: PROMPT_VERSION,
      promptHash,
      modelVersion,
      chainVersion: CHAIN_VERSION,
      policyVersion: POLICY_VERSION,
      inputTokens,
      outputTokens,
      latencyMs,
      temperature: 0.7,
      tcpaChecked: true,
      fairHousingChecked: true,
      quietHoursApplied: false,
    };

    // Persist message BEFORE sending SMS — message record must exist before delivery
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        workspaceId,
        role: MessageRole.AI,
        content,
        aiMetadata: aiMetadata as unknown as Prisma.InputJsonValue,
      },
    });

    // BUG FIX #2: Write qualification data back to lead + advance XState machine
    // Previously, updatedQualification was extracted but never saved — lead.qualification was always {}
    await this.persistQualificationAndAdvanceStatus(
      leadId,
      workspaceId,
      lead.status,
      updatedQualification as Record<string, unknown>,
      lead.qualification as Record<string, unknown>,
      priorAiMessageCount,
    );

    // Step 6: Send SMS (only after message is persisted)
    if (lead.phone) {
      const twilio = new TwilioClient(
        process.env['TWILIO_ACCOUNT_SID'] ?? '',
        process.env['TWILIO_AUTH_TOKEN'] ?? '',
        workspace.twilioNumber ?? process.env['TWILIO_PHONE_NUMBER'] ?? '',
      );
      const smsResult = await twilio.sendSMS(
        {
          to: lead.phone,
          body: content,
          workspaceId,
          purpose: 'customer',
          timezone: workspace.timezone,
        },
        this.prisma,
      );
      if (!smsResult.ok) {
        logger.error({ err: smsResult.error, leadId, messageId: message.id }, 'ai-response: SMS delivery failed');
        await this.prisma.message.update({
          where: { id: message.id, workspaceId },
          data: { failedAt: new Date(), failReason: smsResult.error?.message ?? 'Twilio delivery failure' },
        });
        void this.notificationService.notifyWorkspace(workspaceId, NotificationType.AI_ESCALATION, {
          leadId,
          conversationId,
          reason: `SMS to lead failed: ${smsResult.error?.message ?? 'Twilio error'}. Manual outreach required.`,
        });
      } else {
        await this.prisma.message.update({
          where: { id: message.id, workspaceId },
          data: { providerMessageId: smsResult.value, deliveredAt: new Date() },
        });
      }
    }

    // Track token usage
    await trackUsage(
      workspaceId,
      leadId,
      message.id,
      { input: inputTokens, output: outputTokens },
      'qualification',
      0,
      this.prisma,
    );

    // BUG FIX #9: Enqueue appointment-booking when AI chain signals booking intent
    if (shouldBook) {
      void queues.appointmentBooking
        .add('send-booking-link', { leadId, workspaceId, conversationId }, { removeOnComplete: 1000, priority: 1 })
        .catch((err: unknown) => logger.error({ err, leadId }, 'ai-response: booking enqueue failed'));
    }

    // Downstream jobs — errors are non-fatal but logged
    queues.qualification
      .add('qualify', { leadId, workspaceId, conversationId }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'ai-response: qualification enqueue failed'));
    queues.analyticsIngest
      .add('ai.latency', {
        workspaceId,
        event: 'ai.response.latency',
        leadId,
        metadata: { latencyMs: Date.now() - startMs },
      }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.warn({ err }, 'ai-response: analytics enqueue failed'));
    queues.auditLog
      .add('ai-message', {
        workspaceId,
        action: 'ai.message.sent',
        resourceId: message.id,
        resourceType: 'message',
      }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.warn({ err }, 'ai-response: audit log enqueue failed'));

    this.realtimeEmitter.emitToWorkspace(workspaceId, 'message:new', {
      conversationId,
      messageId: message.id,
      role: 'AI',
      content,
      createdAt: message.createdAt.toISOString(),
    });

    void this.scheduleEvals(message.id, workspaceId, leadId, conversationId);

    logger.info({ leadId, workspaceId, messageId: message.id, latencyMs: Date.now() - startMs, shouldBook }, 'ai-response: complete');
  }

  /**
   * Persists extracted qualification data to the lead and advances the XState machine.
   *
   * State advancement rules:
   *   - 0 prior AI messages (first contact): NEW → CONTACTED (CONTACT_MADE)
   *   - 1+ prior AI messages and lead is CONTACTED: CONTACTED → QUALIFYING (QUALIFICATION_STARTED)
   *   - REACTIVATED leads: REACTIVATED → QUALIFYING on second contact
   */
  private async persistQualificationAndAdvanceStatus(
    leadId: string,
    workspaceId: string,
    currentStatus: LeadStatus,
    updatedQualification: Record<string, unknown>,
    existingQualification: Record<string, unknown>,
    priorAiMessageCount: number,
  ): Promise<void> {
    const qualificationChanged =
      JSON.stringify(updatedQualification) !== JSON.stringify(existingQualification);

    let newStatus = currentStatus;

    // Determine state transition based on message history
    if (priorAiMessageCount === 0 && currentStatus === LeadStatus.NEW) {
      const next = transitionLead(currentStatus, { type: 'CONTACT_MADE' }, { leadId, workspaceId });
      if (next !== currentStatus) newStatus = next;
    } else if (priorAiMessageCount >= 1 && currentStatus === LeadStatus.CONTACTED) {
      const next = transitionLead(currentStatus, { type: 'QUALIFICATION_STARTED' }, { leadId, workspaceId });
      if (next !== currentStatus) newStatus = next;
    } else if (priorAiMessageCount >= 1 && currentStatus === LeadStatus.REACTIVATED) {
      const next = transitionLead(currentStatus, { type: 'QUALIFICATION_STARTED' }, { leadId, workspaceId });
      if (next !== currentStatus) newStatus = next;
    }

    const statusChanged = newStatus !== currentStatus;

    if (!qualificationChanged && !statusChanged) return;

    await this.prisma.lead.update({
      where: { id: leadId, workspaceId },
      data: {
        ...(qualificationChanged ? { qualification: updatedQualification as Prisma.InputJsonValue } : {}),
        ...(statusChanged ? { status: newStatus } : {}),
      },
    });

    if (statusChanged) {
      // Map state to a typed LeadEventType for the event log
      const eventTypeMap: Partial<Record<string, 'lead.contacted' | 'lead.qualification.started'>> = {
        CONTACTED: 'lead.contacted',
        QUALIFYING: 'lead.qualification.started',
      };
      const eventType = eventTypeMap[newStatus] ?? 'lead.contacted';
      await this.eventStore.append({
        leadId,
        workspaceId,
        type: eventType,
        payload: { from: currentStatus, to: newStatus },
        triggeredBy: 'ai-response-processor',
      });
    }
  }

  private async scheduleEvals(messageId: string, workspaceId: string, leadId: string, conversationId: string): Promise<void> {
    const evalData: EvalJobData = { messageId, workspaceId, leadId, conversationId };
    try {
      await runEvals(evalData, this.prisma, this.vertexClient);
    } catch (err) {
      logger.warn({ err, messageId }, 'ai-response: eval run failed (non-critical)');
    }
  }
}
