import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHash } from 'crypto';
import { logger } from '@conversionops/observability';
import { queues, EventStore, transitionLead } from '@conversionops/orchestration';
import type { AiResponseJobData } from '@conversionops/orchestration';
import {
  isOptOutKeyword,
  processOptOut,
  isQuietHours,
  getNextAllowedTime,
} from '@conversionops/compliance';
import { checkFairHousing } from '@conversionops/compliance';
import {
  VertexAIClient,
  runQualificationChain,
  checkQuota,
  trackUsage,
  alertIfApproaching,
} from '@conversionops/ai';
import { TwilioClient } from '@conversionops/integrations';
import {
  LeadStatus,
  MessageRole,
  NotificationType,
  Prisma,
} from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RealtimeEmitterService } from '../modules/realtime/realtime-emitter.service';

const PROMPT_VERSION = 'qualification-v1.0.0';
const CHAIN_VERSION = 'qualification-chain-v1.0.0';
const POLICY_VERSION = 'fair-housing-policy-v1.0.0';

@Injectable()
export class AiResponseProcessor {
  private readonly eventStore: EventStore;
  private readonly vertexClient: VertexAIClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {
    this.eventStore = new EventStore(prisma);
    this.vertexClient = new VertexAIClient();
  }

  /**
   * Processes ai-response jobs. Full 7-step pre-send checklist before generating and sending.
   * This is the core AI loop — TCPA, FHA, quota, and conversation logic all enforced here.
   */
  async process(job: Job<AiResponseJobData>): Promise<void> {
    const { leadId, workspaceId, conversationId } = job.data;
    const startMs = Date.now();

    const [lead, workspace, conversation] = await Promise.all([
      this.prisma.lead.findFirst({ where: { id: leadId, workspaceId, deletedAt: null } }),
      this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null } }),
      this.prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId, deletedAt: null },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
    ]);

    if (!lead || !workspace || !conversation) {
      logger.warn({ leadId, workspaceId, conversationId }, 'ai-response: lead/workspace/conversation not found, skipping');
      return;
    }

    // Step 1: Check if AI is allowed (human takeover or workspace pause)
    if (!conversation.aiActive || workspace.aiPaused) {
      logger.info({ conversationId, workspaceId }, 'ai-response: AI not allowed (paused or taken over), skipping');
      return;
    }

    // Step 2: Check latest inbound message for opt-out keyword
    const latestMessage = conversation.messages[0];
    if (latestMessage?.role === MessageRole.HUMAN) {
      if (isOptOutKeyword(latestMessage.content)) {
        await processOptOut(lead.phone ?? '', workspaceId, latestMessage.content, this.prisma);
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { status: LeadStatus.OPT_OUT },
        });
        await this.eventStore.append({
          leadId,
          workspaceId,
          type: 'lead.opted-out',
          payload: { keyword: latestMessage.content },
          triggerSource: 'ai-response-processor',
        });
        logger.info({ leadId, workspaceId }, 'ai-response: opt-out detected, halting');
        return;
      }
    }

    // Step 3: Check quiet hours using workspace timezone
    const timezone = workspace.timezone ?? 'America/New_York';
    if (isQuietHours(timezone)) {
      const nextAllowed = getNextAllowedTime(timezone);
      const delayMs = Math.max(0, nextAllowed.getTime() - Date.now());
      await queues.aiResponse.add(
        'ai-response',
        { leadId, workspaceId, conversationId },
        { delay: delayMs, removeOnComplete: 500, priority: 2 },
      );
      logger.info({ leadId, workspaceId, nextAllowed }, 'ai-response: quiet hours active, rescheduled');
      return;
    }

    // Step 4: Check token quota
    const quota = await checkQuota(workspaceId, this.prisma);
    if (!quota.allowed) {
      const alertResult = await alertIfApproaching(workspaceId, quota.percentUsed, this.prisma);
      if (alertResult.shouldAlert) {
        await queues.notification
          .add('quota-exhausted', {
            workspaceId,
            type: NotificationType.QUOTA_WARNING,
            payload: { exhausted: true, workspaceId },
            isOpsAlert: false,
          }, { removeOnComplete: 1000, priority: 1 })
          .catch(() => undefined);
      }
      logger.warn({ leadId, workspaceId, quota }, 'ai-response: quota exhausted, halting');
      return;
    }

    await alertIfApproaching(workspaceId, quota.percentUsed, this.prisma);

    // Steps 5-7: Generate, check FHA, send
    const chainResult = await runQualificationChain(
      conversationId,
      workspace,
      lead,
      this.vertexClient,
      this.prisma,
    );

    if (!chainResult.ok) {
      logger.error({ err: chainResult.error, leadId, workspaceId }, 'ai-response: qualification chain failed');
      return;
    }

    const { content, updatedQualification, shouldBook, inputTokens, outputTokens, latencyMs } =
      chainResult.value;

    // Step 6: Fair Housing check
    const fhaResult = checkFairHousing(content);
    if (!fhaResult.passed && fhaResult.severity === 'block') {
      logger.warn({ leadId, workspaceId, flaggedPatterns: fhaResult.flaggedPatterns }, 'ai-response: FHA block, escalating');
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          escalationLevel: 'ESCALATED',
          escalationReason: `FHA policy block: ${fhaResult.flaggedPatterns.join(', ')}`,
          escalatedAt: new Date(),
          aiActive: false,
          status: 'HUMAN_ACTIVE',
        },
      });
      await queues.auditLog
        .add('ai.fha_block', { workspaceId, action: 'ai.fha_block', resource: 'message', metadata: { flaggedPatterns: fhaResult.flaggedPatterns } }, { removeOnComplete: 1000 })
        .catch(() => undefined);
      return;
    }

    // Step 7a: Create Message record with complete AIMessageMetadata
    const promptHash = createHash('sha256')
      .update(`${PROMPT_VERSION}:${content}`)
      .digest('hex')
      .slice(0, 16);

    const aiMetadata: Prisma.InputJsonValue = {
      promptVersion: PROMPT_VERSION,
      promptHash,
      modelVersion: this.vertexClient.getModelId(),
      chainVersion: CHAIN_VERSION,
      policyVersion: POLICY_VERSION,
      inputTokens,
      outputTokens,
      latencyMs,
      temperature: 0.7,
      tcpaChecked: true,
      fairHousingChecked: true,
      quietHoursApplied: false,
      fhaPassed: fhaResult.passed,
      fhaSeverity: fhaResult.severity,
    };

    const message = await this.prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        role: MessageRole.AI,
        content,
        aiMetadata,
      },
    });

    // Step 7b: Send SMS via Twilio
    const accountSid = process.env['TWILIO_ACCOUNT_SID'] ?? '';
    const authToken = process.env['TWILIO_AUTH_TOKEN'] ?? '';
    const fromNumber = process.env['TWILIO_PHONE_NUMBER'] ?? workspace.twilioNumber ?? '';

    if (lead.phone && fromNumber) {
      const twilioClient = new TwilioClient(accountSid, authToken, fromNumber);
      const smsResult = await twilioClient.sendSMS(
        { to: lead.phone, body: content, workspaceId, workspaceTimezone: timezone },
        this.prisma,
      );

      if (!smsResult.ok) {
        logger.error({ err: smsResult.error, leadId, messageId: message.id }, 'ai-response: SMS send failed');
        await this.prisma.message.update({
          where: { id: message.id },
          data: { failedAt: new Date(), failReason: smsResult.error.message },
        });
      } else {
        await this.prisma.message.update({
          where: { id: message.id },
          data: { providerMessageId: smsResult.value, deliveredAt: new Date() },
        });
      }
    }

    // Step 7c: Transition lead status via XState
    const eventType = lead.status === LeadStatus.NEW ? 'CONTACT_MADE' : 'QUALIFICATION_STARTED';
    const newStatus = transitionLead(lead.status, { type: eventType }, { leadId, workspaceId });
    if (newStatus !== lead.status) {
      await this.prisma.lead.update({ where: { id: leadId }, data: { status: newStatus } });
    }

    // Update qualification data
    if (Object.keys(updatedQualification).length > 0) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { qualification: updatedQualification as Prisma.InputJsonValue },
      });
    }

    // Step 7d: Append LeadEvent
    const leadEventType =
      lead.status === LeadStatus.NEW ? 'lead.contacted' : 'lead.qualification.progressed';
    await this.eventStore.append({
      leadId,
      workspaceId,
      type: leadEventType,
      payload: { conversationId, messageId: message.id, shouldBook },
      triggerSource: 'ai-response-processor',
    });

    // Step 7e: Track token usage
    const totalTokens = inputTokens + outputTokens;
    const costCents = Math.ceil((totalTokens / 1_000_000) * 7.5);
    await trackUsage(
      workspaceId,
      leadId,
      message.id,
      { input: inputTokens, output: outputTokens },
      'qualification',
      costCents,
      this.prisma,
    ).catch((err: unknown) => logger.error({ err }, 'ai-response: trackUsage failed'));

    // Step 7f: Enqueue qualification job
    await queues.qualification
      .add('qualify', { leadId, workspaceId, conversationId }, { removeOnComplete: 500 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'ai-response: qualification enqueue failed'));

    // Step 7g: Enqueue analytics
    await queues.analyticsIngest
      .add('analytics-ingest', { leadId, workspaceId, event: leadEventType, metadata: { messageId: message.id } }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'ai-response: analytics enqueue failed'));

    // Step 7h: Enqueue audit log
    await queues.auditLog
      .add('ai.message.sent', {
        workspaceId,
        action: 'ai.message.sent',
        resource: 'message',
        resourceId: message.id,
        metadata: { leadId, conversationId, inputTokens, outputTokens },
      }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'ai-response: audit enqueue failed'));

    // Step 7i: Emit Socket.IO events
    this.realtimeEmitter.emitToWorkspace(workspaceId, 'message:new', {
      conversationId,
      messageId: message.id,
      role: 'AI',
      content,
      createdAt: message.createdAt.toISOString(),
    });
    this.realtimeEmitter.emitToConversation(conversationId, 'message:new', {
      conversationId,
      messageId: message.id,
      role: 'AI',
      content,
      createdAt: message.createdAt.toISOString(),
    });

    if (Object.keys(updatedQualification).length > 0) {
      const updatedLead = await this.prisma.lead.findFirst({
        where: { id: leadId, workspaceId },
        select: { score: true, tier: true },
      });
      if (updatedLead) {
        this.realtimeEmitter.emitToWorkspace(workspaceId, 'lead:scored', {
          leadId,
          score: updatedLead.score,
          tier: updatedLead.tier,
        });
      }
    }

    const totalMs = Date.now() - startMs;
    logger.info({ leadId, workspaceId, messageId: message.id, totalMs }, 'ai-response: completed');
  }
}
