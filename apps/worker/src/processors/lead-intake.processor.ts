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
   * Processes incoming lead intake jobs. Creates or finds lead + conversation,
   * stores the inbound message, then enqueues the ai-response job.
   *
   * BUG FIX #6: Lead lookup+create now uses a serializable transaction to prevent
   * duplicate leads from concurrent jobs (e.g., Zillow retry + SMS inbound simultaneously).
   * BUG FIX #7: Conversation lookup+create also serialized to prevent duplicate conversations.
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

      const leadSource = resolveSource(source ?? metadata?.['source']);

      // BUG FIX #6: Serializable transaction prevents duplicate lead creation
      // under concurrent intake for the same phone number
      let isNewLead = false;
      const lead = await this.findOrCreateLead(leadId, from, email, name, workspaceId, leadSource, metadata, () => { isNewLead = true; });
      leadId = lead.id;

      if (isNewLead) {
        await this.eventStore.append({
          leadId,
          workspaceId,
          type: 'lead.created',
          payload: { source: leadSource, phone: from, email },
          triggeredBy: 'system',
        });

        this.realtimeEmitter.emitToWorkspace(workspaceId, 'lead:created', {
          leadId,
          source: leadSource,
        });

        logger.info({ leadId, workspaceId, source: leadSource }, 'lead-intake: new lead created');
      }

      // BUG FIX #7: Serializable transaction prevents duplicate conversation creation
      const conversation = await this.findOrCreateConversation(leadId, workspaceId, to);

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

      // Enqueue AI response with high priority
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

  /**
   * Finds an existing lead by phone or creates one atomically inside a serializable transaction.
   * The onCreated callback fires only if a new lead was inserted.
   */
  private async findOrCreateLead(
    leadId: string | undefined,
    phone: string | undefined,
    email: string | undefined,
    name: string | undefined,
    workspaceId: string,
    leadSource: LeadSource,
    metadata: Record<string, unknown> | undefined,
    onCreated: () => void,
  ): Promise<{ id: string }> {
    if (leadId) {
      const existing = await this.prisma.lead.findFirst({
        where: { id: leadId, workspaceId, deletedAt: null },
      });
      if (existing) return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction with FOR UPDATE semantics (serializable)
      const existing = phone
        ? await tx.lead.findFirst({ where: { phone, workspaceId, deletedAt: null } })
        : email
          ? await tx.lead.findFirst({ where: { email, workspaceId, deletedAt: null } })
          : null;

      if (existing) return existing;

      onCreated();
      return tx.lead.create({
        data: {
          workspaceId,
          phone: phone ?? null,
          email: email ?? null,
          name: name ?? phone ?? 'Unknown',
          source: leadSource,
          status: LeadStatus.NEW,
          qualification: {} as Prisma.InputJsonValue,
          sourcePayload: (metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    }, { isolationLevel: 'Serializable' });
  }

  /**
   * Finds an existing active conversation or creates one atomically.
   */
  private async findOrCreateConversation(
    leadId: string,
    workspaceId: string,
    toNumber: string | undefined,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findFirst({
        where: {
          leadId,
          workspaceId,
          status: { not: ConversationStatus.COMPLETED },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) return existing;

      return tx.conversation.create({
        data: {
          workspaceId,
          leadId,
          channel: Channel.SMS,
          status: ConversationStatus.AI_ACTIVE,
          aiActive: true,
          toNumber: toNumber ?? null,
        },
      });
    }, { isolationLevel: 'Serializable' });
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
