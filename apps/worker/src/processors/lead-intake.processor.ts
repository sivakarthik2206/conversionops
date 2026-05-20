import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, EventStore } from '@conversionops/orchestration';
import type { LeadIntakeJobData } from '@conversionops/orchestration';
import { LeadStatus, LeadSource, ConversationStatus, Channel, MessageRole } from '@conversionops/db';
import type { Prisma } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RealtimeEmitterService } from '../modules/realtime/realtime-emitter.service';

@Injectable()
export class LeadIntakeProcessor {
  private readonly eventStore: EventStore;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Processes incoming lead intake jobs. Creates or updates lead + conversation,
   * then enqueues the ai-response job.
   */
  async process(job: Job<LeadIntakeJobData>): Promise<void> {
    const { workspaceId, from, to, body, messageSid, source, name, email, metadata } = job.data;
    let { leadId } = job.data;

    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) {
        logger.warn({ workspaceId }, 'lead-intake: workspace not found, skipping');
        return;
      }

      // Find or create lead by phone
      let lead = leadId
        ? await this.prisma.lead.findFirst({ where: { id: leadId, workspaceId, deletedAt: null } })
        : from
          ? await this.prisma.lead.findFirst({ where: { phone: from, workspaceId, deletedAt: null } })
          : null;

      const leadSource = resolveSource(source ?? metadata?.['source']);

      if (!lead) {
        lead = await this.prisma.lead.create({
          data: {
            workspaceId,
            phone: from ?? null,
            email: email ?? null,
            name: name ?? from ?? 'Unknown',
            source: leadSource,
            status: LeadStatus.NEW,
            qualification: {} as Prisma.InputJsonValue,
            sourcePayload: (metadata ?? {}) as Prisma.InputJsonValue,
          },
        });

        await this.eventStore.append({
          leadId: lead.id,
          workspaceId,
          type: 'lead.created',
          payload: { source: leadSource, phone: from, email },
          triggeredBy: 'system',
        });

        this.realtimeEmitter.emitToWorkspace(workspaceId, 'lead:created', {
          leadId: lead.id,
          source: leadSource,
        });

        logger.info({ leadId: lead.id, workspaceId, source: leadSource }, 'lead-intake: new lead created');
      }

      leadId = lead.id;

      // Find or create conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: { leadId, workspaceId, status: { not: ConversationStatus.COMPLETED }, deletedAt: null },
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
          },
        });
      }

      // Store inbound message if body is present
      if (body) {
        await this.prisma.message.create({
          data: {
            workspaceId,
            conversationId: conversation.id,
            role: MessageRole.HUMAN,
            content: body,
            providerMessageId: messageSid ?? null,
          },
        });
      }

      // Enqueue AI response
      await queues.aiResponse.add(
        'respond',
        { leadId, workspaceId, conversationId: conversation.id },
        { removeOnComplete: 1000, priority: 1 },
      );

      logger.info({ leadId, workspaceId, conversationId: conversation.id }, 'lead-intake: ai-response enqueued');
    } catch (err) {
      logger.error({ err, workspaceId, leadId }, 'lead-intake: processing error');
      throw err;
    }
  }
}

function resolveSource(source: unknown): LeadSource {
  const s = String(source ?? '').toUpperCase();
  const valid: Record<string, LeadSource> = {
    ZILLOW: LeadSource.ZILLOW,
    REALTOR_COM: LeadSource.REALTOR_COM,
    WEB_FORM: LeadSource.WEB_FORM,
    MISSED_CALL: LeadSource.MISSED_CALL,
    SMS_INBOUND: LeadSource.SMS_INBOUND,
    MANUAL: LeadSource.MANUAL,
    REACTIVATION: LeadSource.REACTIVATION,
    REFERRAL: LeadSource.REFERRAL,
  };
  return valid[s] ?? LeadSource.OTHER;
}
