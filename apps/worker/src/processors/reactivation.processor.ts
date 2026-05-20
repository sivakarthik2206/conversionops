import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import type { ReactivationJobData } from '@conversionops/orchestration';
import { queues } from '@conversionops/orchestration';
import { LeadStatus, ConversationStatus, Channel, MessageRole } from '@conversionops/db';
import { isQuietHours, validateConsent } from '@conversionops/compliance';
import { TwilioClient } from '@conversionops/integrations';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RealtimeEmitterService } from '../modules/realtime/realtime-emitter.service';

const MAX_REACTIVATION_COUNT = 3;

@Injectable()
export class ReactivationProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  /**
   * Reactivates a dormant lead with a personalised re-engagement message.
   * Enforces: max 3 reactivation attempts, consent check, quiet hours.
   */
  async process(job: Job<ReactivationJobData>): Promise<void> {
    const { leadId, workspaceId } = job.data;

    try {
      const [lead, workspace] = await Promise.all([
        this.prisma.lead.findFirst({ where: { id: leadId, workspaceId, deletedAt: null } }),
        this.prisma.workspace.findUnique({ where: { id: workspaceId } }),
      ]);

      if (!lead || !workspace) {
        logger.warn({ leadId, workspaceId }, 'reactivation: lead or workspace not found');
        return;
      }

      if (lead.reactivationCount >= MAX_REACTIVATION_COUNT) {
        logger.info({ leadId, count: lead.reactivationCount }, 'reactivation: max attempts reached, skipping');
        return;
      }

      if (!lead.phone) {
        logger.warn({ leadId }, 'reactivation: no phone number, skipping');
        return;
      }

      if (isQuietHours(workspace.timezone)) {
        logger.info({ workspaceId, leadId }, 'reactivation: quiet hours, skipping');
        return;
      }

      const hasConsent = await validateConsent(lead.phone, workspaceId, this.prisma);
      if (!hasConsent) {
        logger.warn({ leadId, phone: lead.phone }, 'reactivation: no consent, skipping');
        return;
      }

      const config = workspace.aiConfig as Record<string, unknown>;
      const agentName = (config?.['agentName'] as string | undefined) ?? workspace.name;
      const message = buildReactivationMessage(agentName, lead.reactivationCount);

      const twilio = new TwilioClient(
        process.env['TWILIO_ACCOUNT_SID'] ?? '',
        process.env['TWILIO_AUTH_TOKEN'] ?? '',
        workspace.twilioNumber ?? process.env['TWILIO_PHONE_NUMBER'] ?? '',
      );

      const smsResult = await twilio.sendSMS({ to: lead.phone, body: message, workspaceId }, this.prisma);

      if (!smsResult.ok) {
        logger.error({ err: smsResult.error, leadId }, 'reactivation: SMS failed');
        return;
      }

      // Update lead status and increment reactivation count
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.REACTIVATED,
          reactivationCount: { increment: 1 },
        },
      });

      // Find or create conversation
      const conversation = await this.prisma.conversation.findFirst({
        where: { leadId, workspaceId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }) ?? await this.prisma.conversation.create({
        data: {
          workspaceId,
          leadId,
          channel: Channel.SMS,
          status: ConversationStatus.AI_ACTIVE,
          aiActive: true,
        },
      });

      await this.prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          role: MessageRole.AI,
          content: message,
          providerMessageId: smsResult.value,
        },
      });

      this.realtimeEmitter.emitToWorkspace(workspaceId, 'lead:scored', {
        leadId,
        status: LeadStatus.REACTIVATED,
      });

      void queues.aiResponse.add('reactivation-followup', {
        leadId,
        workspaceId,
        conversationId: conversation.id,
      }, { removeOnComplete: 1000 });

      logger.info({ leadId, workspaceId, count: lead.reactivationCount + 1 }, 'reactivation: complete');
    } catch (err) {
      logger.error({ err, leadId, workspaceId }, 'reactivation: processing error');
      throw err;
    }
  }
}

function buildReactivationMessage(agentName: string, attempt: number): string {
  const messages = [
    `Hi! This is ${agentName}'s assistant. Just checking in — are you still interested in buying or selling a home? Happy to help whenever you're ready!`,
    `Hi! Following up on your real estate inquiry. The market has been moving fast — want to chat about your options? Reply YES and I'll get you connected.`,
    `Last check-in: Are you still looking for a home? I have some great new listings that might interest you. Reply STOP anytime to opt out.`,
  ];
  return messages[Math.min(attempt, messages.length - 1)] ?? messages[0]!;
}
