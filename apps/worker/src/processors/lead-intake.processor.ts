import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, EventStore } from '@conversionops/orchestration';
import type { LeadIntakeJobData } from '@conversionops/orchestration';
import { LeadSource, LeadStatus, ConversationStatus, MessageRole, Channel, Prisma } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class LeadIntakeProcessor {
  private readonly eventStore: EventStore;

  constructor(private readonly prisma: PrismaService) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Processes lead-intake jobs. Handles both API-created leads and SMS-path leads.
   * For SMS-path: creates/finds Lead + Conversation + inbound Message.
   * Appends lead.created event and enqueues downstream jobs.
   */
  async process(job: Job<LeadIntakeJobData>): Promise<void> {
    const data = job.data;
    const { workspaceId } = data;

    if (data.leadId) {
      await this.processApiLead(data.leadId, workspaceId);
      return;
    }

    if (data.from) {
      await this.processSmsLead(data);
      return;
    }

    logger.warn({ jobId: job.id }, 'lead-intake: no leadId or from phone, skipping');
  }

  private async processApiLead(leadId: string, workspaceId: string): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, deletedAt: null },
    });

    if (!lead) {
      logger.warn({ leadId, workspaceId }, 'lead-intake: lead not found, skipping');
      return;
    }

    if (lead.externalId) {
      const duplicate = await this.prisma.lead.findFirst({
        where: { workspaceId, externalId: lead.externalId, deletedAt: null, NOT: { id: leadId } },
      });
      if (duplicate) {
        logger.info({ leadId, externalId: lead.externalId }, 'lead-intake: duplicate externalId, skipping');
        return;
      }
    }

    const existingEvent = await this.prisma.leadEvent.findFirst({
      where: { leadId, type: 'lead.created' },
    });
    if (!existingEvent) {
      await this.eventStore.append({ leadId, workspaceId, type: 'lead.created', payload: { source: lead.source }, triggerSource: 'api' });
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { leadId, workspaceId, deletedAt: null },
    });

    if (conversation) {
      await this.enqueueDownstream(leadId, workspaceId, conversation.id);
    }

    await queues.analyticsIngest
      .add('analytics-ingest', { leadId, workspaceId, event: 'lead.created' }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'lead-intake: analytics enqueue failed'));
  }

  private async processSmsLead(data: LeadIntakeJobData): Promise<void> {
    const { workspaceId, from: fromPhone, body: messageBody, messageSid, source } = data;
    if (!fromPhone || !messageBody) return;

    const existingLead = await this.prisma.lead.findFirst({
      where: { workspaceId, phone: fromPhone, deletedAt: null },
    });

    let leadId: string;
    let isNew = false;

    if (existingLead && data.externalId) {
      const duplicate = await this.prisma.lead.findFirst({
        where: { workspaceId, externalId: data.externalId, deletedAt: null },
      });
      if (duplicate) {
        leadId = duplicate.id;
      } else {
        leadId = existingLead.id;
      }
    } else if (existingLead) {
      leadId = existingLead.id;
    } else {
      const newLead = await this.prisma.lead.create({
        data: {
          workspaceId,
          source: (source as LeadSource | undefined) ?? LeadSource.SMS_INBOUND,
          status: LeadStatus.NEW,
          phone: fromPhone,
          name: data.name,
          email: data.email,
          externalId: data.externalId,
          sourcePayload: (data.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      leadId = newLead.id;
      isNew = true;
    }

    let conversation = await this.prisma.conversation.findFirst({
      where: { leadId, workspaceId, status: { not: 'OPT_OUT' }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          workspaceId,
          leadId,
          channel: Channel.SMS,
          status: ConversationStatus.AI_ACTIVE,
          aiActive: true,
          fromNumber: fromPhone,
          toNumber: data.to,
        },
      });
    }

    const existingMessage = messageSid
      ? await this.prisma.message.findFirst({
          where: { conversationId: conversation.id, providerMessageId: messageSid },
        })
      : null;

    if (!existingMessage) {
      await this.prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          role: MessageRole.HUMAN,
          content: messageBody,
          providerMessageId: messageSid,
          providerPayload: ({ From: fromPhone, Body: messageBody, MessageSid: messageSid }) as Prisma.InputJsonValue,
        },
      });
    }

    if (isNew) {
      await this.eventStore.append({
        leadId,
        workspaceId,
        type: 'lead.created',
        payload: { source: source ?? 'SMS_INBOUND', phone: fromPhone },
        triggerSource: 'twilio_sms',
      });
    }

    await this.enqueueDownstream(leadId, workspaceId, conversation.id);

    await queues.analyticsIngest
      .add('analytics-ingest', { leadId, workspaceId, event: isNew ? 'lead.created' : 'lead.message_received' }, { removeOnComplete: 1000 })
      .catch((err: unknown) => logger.error({ err, leadId }, 'lead-intake: analytics enqueue failed'));

    logger.info({ leadId, workspaceId, conversationId: conversation.id }, 'lead-intake: SMS lead processed');
  }

  private async enqueueDownstream(leadId: string, workspaceId: string, conversationId: string): Promise<void> {
    await queues.aiResponse
      .add(
        'ai-response',
        { leadId, workspaceId, conversationId },
        { removeOnComplete: 500, priority: 2 },
      )
      .catch((err: unknown) => logger.error({ err, leadId }, 'lead-intake: ai-response enqueue failed'));
  }
}
