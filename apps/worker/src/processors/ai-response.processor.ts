import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHash } from 'crypto';
import { logger } from '@conversionops/observability';
import { queues } from '@conversionops/orchestration';
import type { AiResponseJobData } from '@conversionops/orchestration';
import type { EvalJobData } from '@conversionops/ai';
import { ConsentChannel, ConsentStatus, MessageRole, NotificationType } from '@conversionops/db';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {
    this.vertexClient = new VertexAIClient();
    this.notificationService = new NotificationService(queues.notification);
  }

  /**
   * 7-step AI response pipeline. Pre-send checklist enforces TCPA, quota, and FHA compliance.
   * SMS is only sent after the message record is persisted.
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

    // Step 1: Check AI is allowed
    if (workspace.aiPaused) {
      logger.info({ workspaceId, leadId }, 'ai-response: workspace AI paused, skipping');
      return;
    }
    if (!conversation.aiActive) {
      logger.info({ conversationId, leadId }, 'ai-response: conversation AI not active, skipping');
      return;
    }

    // Step 2: Check opt-out keyword on last inbound message
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

    // Generate AI response
    const startMs = Date.now();
    const chainResult = await runQualificationChain(conversationId, workspace, lead, this.vertexClient, this.prisma);

    if (!chainResult.ok) {
      logger.error({ err: chainResult.error, leadId, workspaceId }, 'ai-response: chain failed');
      return;
    }

    const { content, inputTokens, outputTokens, latencyMs } = chainResult.value;

    // Step 5: Fair Housing check
    const fhaResult = checkFairHousing(content);
    if (!fhaResult.passed && fhaResult.severity === 'block') {
      logger.error({ leadId, flaggedPatterns: fhaResult.flaggedPatterns }, 'ai-response: FHA violation blocked');
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

    // Persist message BEFORE sending SMS
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        workspaceId,
        role: MessageRole.AI,
        content,
        aiMetadata: aiMetadata as unknown as Prisma.InputJsonValue,
      },
    });

    // Send SMS — only after message is persisted
    if (lead.phone) {
      const consentRecord = await this.prisma.consentRecord.findFirst({
        where: { phone: lead.phone, workspaceId, channel: ConsentChannel.SMS, status: ConsentStatus.OPTED_IN },
      });

      if (consentRecord) {
        const twilio = new TwilioClient(
          process.env['TWILIO_ACCOUNT_SID'] ?? '',
          process.env['TWILIO_AUTH_TOKEN'] ?? '',
          workspace.twilioNumber ?? process.env['TWILIO_PHONE_NUMBER'] ?? '',
        );
        const smsResult = await twilio.sendSMS({ to: lead.phone, body: content, workspaceId });
        if (!smsResult.ok) {
          logger.error({ err: smsResult.error, leadId }, 'ai-response: SMS send failed');
        } else {
          await this.prisma.message.update({
            where: { id: message.id, workspaceId },
            data: { providerMessageId: smsResult.value, deliveredAt: new Date() },
          });
        }
      } else {
        logger.warn({ leadId, phone: lead.phone }, 'ai-response: no consent, SMS not sent');
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

    // Enqueue downstream jobs (non-blocking)
    void queues.qualification.add('qualify', { leadId, workspaceId, conversationId }, { removeOnComplete: 1000 });
    void queues.analyticsIngest.add('ai.latency', {
      workspaceId,
      event: 'ai.response.latency',
      leadId,
      metadata: { latencyMs: Date.now() - startMs },
    }, { removeOnComplete: 1000 });
    void queues.auditLog.add('ai-message', {
      workspaceId,
      action: 'ai.message.sent',
      resourceId: message.id,
      resourceType: 'message',
    }, { removeOnComplete: 1000 });

    // Emit real-time event
    this.realtimeEmitter.emitToWorkspace(workspaceId, 'message:new', {
      conversationId,
      messageId: message.id,
      role: 'AI',
      content,
      createdAt: message.createdAt.toISOString(),
    });

    // Run evals async — never awaited
    void this.scheduleEvals(message.id, workspaceId, leadId, conversationId);

    logger.info({ leadId, workspaceId, messageId: message.id, latencyMs: Date.now() - startMs }, 'ai-response: complete');
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
