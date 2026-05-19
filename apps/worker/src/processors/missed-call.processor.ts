import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, EventStore } from '@conversionops/orchestration';
import type { MissedCallJobData } from '@conversionops/orchestration';
import { TwilioClient } from '@conversionops/integrations';
import {
  ConsentStatus,
  ConsentChannel,
  LeadSource,
  LeadStatus,
  ConversationStatus,
  MessageRole,
  Channel,
  Prisma,
} from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class MissedCallProcessor {
  private readonly eventStore: EventStore;

  constructor(private readonly prisma: PrismaService) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Handles missed call recovery — 8-second SLA target.
   * Sends immediate SMS text-back, creates Lead + Conversation, starts AI flow.
   */
  async process(job: Job<MissedCallJobData>): Promise<void> {
    const { workspaceId, fromNumber, callSid } = job.data;

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });

    if (!workspace) {
      logger.warn({ workspaceId }, 'missed-call: workspace not found, skipping');
      return;
    }

    const aiConfig = workspace.aiConfig as Record<string, unknown>;
    const agentName = typeof aiConfig['agentName'] === 'string' ? aiConfig['agentName'] : 'Alex';

    // Ensure consent record exists — missed call implies consent for callback
    const existingConsent = await this.prisma.consentRecord.findFirst({
      where: { phone: fromNumber, workspaceId, deletedAt: null },
    });

    if (!existingConsent) {
      await this.prisma.consentRecord.create({
        data: {
          workspaceId,
          phone: fromNumber,
          channel: ConsentChannel.SMS,
          status: ConsentStatus.OPTED_IN,
          consentMethod: 'missed_call_implied',
          consentText: `Implied consent from missed call ${callSid}`,
          consentSource: 'twilio_voice',
        },
      });
      logger.info({ phone: fromNumber, workspaceId }, 'missed-call: consent created via missed call');
    } else if (existingConsent.status !== ConsentStatus.OPTED_IN) {
      logger.info({ phone: fromNumber, workspaceId }, 'missed-call: phone opted out, skipping');
      return;
    }

    const messageBody = `Hi! You just called ${agentName}'s office at ${workspace.name}. This is their AI assistant — are you looking to buy or sell a property? I can help right now!`;

    const accountSid = process.env['TWILIO_ACCOUNT_SID'] ?? '';
    const authToken = process.env['TWILIO_AUTH_TOKEN'] ?? '';
    const fromTwilioNumber = process.env['TWILIO_PHONE_NUMBER'] ?? workspace.twilioNumber ?? '';

    if (!fromTwilioNumber) {
      logger.error({ workspaceId }, 'missed-call: no Twilio number configured');
      return;
    }

    const twilioClient = new TwilioClient(accountSid, authToken, fromTwilioNumber);
    const smsResult = await twilioClient.sendSMS(
      { to: fromNumber, body: messageBody, workspaceId, workspaceTimezone: workspace.timezone },
      this.prisma,
    );

    if (!smsResult.ok) {
      logger.error({ err: smsResult.error, phone: fromNumber, workspaceId }, 'missed-call: SMS send failed');
    }

    const existingLead = await this.prisma.lead.findFirst({
      where: { workspaceId, phone: fromNumber, deletedAt: null },
    });

    const lead = existingLead ?? await this.prisma.lead.create({
      data: {
        workspaceId,
        source: LeadSource.MISSED_CALL,
        status: LeadStatus.NEW,
        phone: fromNumber,
        sourcePayload: ({ callSid, fromNumber, workspaceId }) as Prisma.InputJsonValue,
      },
    });

    let conversation = await this.prisma.conversation.findFirst({
      where: { leadId: lead.id, workspaceId, status: { not: 'OPT_OUT' }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          workspaceId,
          leadId: lead.id,
          channel: Channel.SMS,
          status: ConversationStatus.AI_ACTIVE,
          aiActive: true,
          fromNumber,
          toNumber: fromTwilioNumber,
        },
      });
    }

    if (smsResult.ok) {
      await this.prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          role: MessageRole.AI,
          content: messageBody,
          providerMessageId: smsResult.value,
          deliveredAt: new Date(),
        },
      });
    }

    if (!existingLead) {
      await this.eventStore.append({
        leadId: lead.id,
        workspaceId,
        type: 'lead.created',
        payload: { source: 'MISSED_CALL', callSid },
        triggerSource: 'missed-call-processor',
      });
    }

    await queues.aiResponse
      .add(
        'ai-response',
        { leadId: lead.id, workspaceId, conversationId: conversation.id },
        { removeOnComplete: 500, priority: 1 },
      )
      .catch((err: unknown) => logger.error({ err, leadId: lead.id }, 'missed-call: ai-response enqueue failed'));

    logger.info({ leadId: lead.id, workspaceId, phone: fromNumber }, 'missed-call: processed successfully');
  }
}
