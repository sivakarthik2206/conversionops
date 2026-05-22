import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues } from '@conversionops/orchestration';
import type { MissedCallJobData } from '@conversionops/orchestration';
import { LeadSource, LeadStatus, ConversationStatus, Channel } from '@conversionops/db';
import type { Prisma } from '@conversionops/db';
import { isQuietHours, validateConsent } from '@conversionops/compliance';
import { TwilioClient } from '@conversionops/integrations';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RealtimeEmitterService } from '../modules/realtime/realtime-emitter.service';

const MISSED_CALL_MESSAGE = 'Hey! You just called — sorry I missed you! I\'m [agentName]\'s virtual assistant. Can I help you with your real estate needs today?';

@Injectable()
export class MissedCallProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  /**
   * Processes missed call jobs. Creates a lead, sends an SMS text-back within 8 seconds of receipt.
   * TCPA: validates consent before sending. Skips if quiet hours.
   */
  async process(job: Job<MissedCallJobData>): Promise<void> {
    const { workspaceId, fromNumber, toNumber, callSid } = job.data;
    let { leadId } = job.data;

    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) {
        logger.warn({ workspaceId }, 'missed-call: workspace not found');
        return;
      }

      if (workspace.aiPaused) {
        logger.info({ workspaceId }, 'missed-call: AI paused, skipping text-back');
        return;
      }

      if (isQuietHours(workspace.timezone)) {
        logger.info({ workspaceId, fromNumber }, 'missed-call: quiet hours, skipping text-back');
        return;
      }

      // Find or create lead
      let lead = leadId
        ? await this.prisma.lead.findFirst({ where: { id: leadId, workspaceId, deletedAt: null } })
        : await this.prisma.lead.findFirst({ where: { phone: fromNumber, workspaceId, deletedAt: null } });

      if (!lead) {
        lead = await this.prisma.lead.create({
          data: {
            workspaceId,
            phone: fromNumber,
            name: fromNumber,
            source: LeadSource.MISSED_CALL,
            status: LeadStatus.NEW,
            qualification: {} as Prisma.InputJsonValue,
            sourcePayload: { callSid } as Prisma.InputJsonValue,
          },
        });

        this.realtimeEmitter.emitToWorkspace(workspaceId, 'lead:created', {
          leadId: lead.id,
          source: 'MISSED_CALL',
        });
      }

      leadId = lead.id;

      // BUG FIX #5 (TCPA): Check for existing OPTED_OUT before creating OPTED_IN consent.
      // Previously, the code created OPTED_IN over any OPTED_OUT record — a TCPA violation.
      // A caller who previously texted STOP must NOT receive a text-back from a missed call.
      const existingOptOut = await this.prisma.consentRecord.findFirst({
        where: { phone: fromNumber, workspaceId, channel: 'SMS', status: 'OPTED_OUT', deletedAt: null },
      });
      if (existingOptOut) {
        logger.info({ fromNumber, workspaceId, leadId }, 'missed-call: caller previously opted out — skipping text-back (TCPA compliance)');
        // Job will complete normally — no SMS sent, no further processing
        return;
      }

      const hasConsent = await validateConsent(fromNumber, workspaceId, this.prisma);
      if (!hasConsent) {
        await this.prisma.consentRecord.create({
          data: {
            workspaceId,
            leadId,
            phone: fromNumber,
            channel: 'SMS',
            status: 'OPTED_IN',
            consentSource: 'missed_call_text_back',
          },
        });
      }

      // Find or create conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: { leadId, workspaceId, status: { not: ConversationStatus.COMPLETED }, deletedAt: null },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            workspaceId,
            leadId,
            channel: Channel.SMS,
            status: ConversationStatus.AI_ACTIVE,
            aiActive: true,
          },
        });
      }

      // Personalise message with agent name
      const agentName = extractAgentName(workspace);
      const smsBody = MISSED_CALL_MESSAGE.replace('[agentName]', agentName);

      // Send text-back immediately
      const twilio = new TwilioClient(
        process.env['TWILIO_ACCOUNT_SID'] ?? '',
        process.env['TWILIO_AUTH_TOKEN'] ?? '',
        toNumber ?? workspace.twilioNumber ?? process.env['TWILIO_PHONE_NUMBER'] ?? '',
      );

      const smsResult = await twilio.sendSMS(
        {
          to: fromNumber,
          body: smsBody,
          workspaceId,
          purpose: 'customer',
          timezone: workspace.timezone,
        },
        this.prisma,
      );
      if (!smsResult.ok) {
        logger.error({ err: smsResult.error, leadId, fromNumber }, 'missed-call: SMS text-back failed');
      } else {
        logger.info({ leadId, fromNumber, messageSid: smsResult.value }, 'missed-call: text-back sent');
      }

      // Enqueue AI follow-up
      await queues.aiResponse.add(
        'missed-call-followup',
        { leadId, workspaceId, conversationId: conversation.id },
        { priority: 1, removeOnComplete: 1000 },
      );
    } catch (err) {
      logger.error({ err, workspaceId, fromNumber, callSid }, 'missed-call: processing error');
      throw err;
    }
  }
}

function extractAgentName(workspace: { name: string; aiConfig: unknown }): string {
  const config = workspace.aiConfig as Record<string, unknown> | null;
  if (config && typeof config['agentName'] === 'string') return config['agentName'];
  return workspace.name;
}
