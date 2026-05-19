import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, EventStore, transitionLead } from '@conversionops/orchestration';
import type { ReactivationJobData } from '@conversionops/orchestration';
import { TwilioClient } from '@conversionops/integrations';
import { isOptOutKeyword, isQuietHours, getNextAllowedTime, validateConsent } from '@conversionops/compliance';
import { LeadStatus, ConsentStatus } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class ReactivationProcessor {
  private readonly eventStore: EventStore;

  constructor(private readonly prisma: PrismaService) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Sends a personalised reactivation SMS to a dormant lead.
   * Respects all TCPA rules. Increments reactivationCount. Max 3 attempts.
   */
  async process(job: Job<ReactivationJobData>): Promise<void> {
    const { leadId, workspaceId } = job.data;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, status: LeadStatus.DORMANT, deletedAt: null },
    });

    if (!lead) {
      logger.info({ leadId, workspaceId }, 'reactivation: lead not found or not DORMANT, skipping');
      return;
    }

    if (lead.reactivationCount >= 3) {
      logger.info({ leadId }, 'reactivation: max reactivation attempts reached');
      return;
    }

    if (!lead.phone) {
      logger.info({ leadId }, 'reactivation: no phone number, skipping');
      return;
    }

    const hasConsent = await validateConsent(lead.phone, workspaceId, this.prisma);
    if (!hasConsent) {
      logger.info({ leadId }, 'reactivation: no consent, skipping');
      return;
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace || !workspace.twilioNumber) return;

    const timezone = workspace.timezone ?? 'America/New_York';
    if (isQuietHours(timezone)) {
      const nextAllowed = getNextAllowedTime(timezone);
      const delayMs = Math.max(0, nextAllowed.getTime() - Date.now());
      await queues.reactivation.add(
        'reactivate',
        { leadId, workspaceId },
        { delay: delayMs, removeOnComplete: 100 },
      );
      logger.info({ leadId, nextAllowed }, 'reactivation: quiet hours, rescheduled');
      return;
    }

    const qual = lead.qualification as Record<string, unknown>;
    const aiConfig = workspace.aiConfig as Record<string, unknown>;
    const agentName = typeof aiConfig['agentName'] === 'string' ? aiConfig['agentName'] : 'our team';
    const leadName = lead.name?.split(' ')[0] ?? 'there';

    const lines: string[] = [];
    const area = typeof qual['area'] === 'string' ? qual['area'] : null;
    const budget = typeof qual['budget'] === 'string' ? qual['budget'] : null;
    const timeline = typeof qual['timeline'] === 'string' ? qual['timeline'] : null;

    if (area) {
      lines.push(`Hi ${leadName}! We spoke a while back about finding a home in ${area}.`);
    } else {
      lines.push(`Hi ${leadName}! We connected a while back about real estate.`);
    }
    if (budget) lines.push(`Homes in your range (around ${budget}) are moving fast right now.`);
    if (timeline === 'near_term' || timeline === '90_days') {
      lines.push('Have your plans changed at all?');
    }
    lines.push(`Would you still like some help? Just reply YES and ${agentName} will pick up right where we left off.`);

    const messageBody = lines.join(' ');

    if (isOptOutKeyword(messageBody)) return;

    const twilioClient = new TwilioClient(
      process.env['TWILIO_ACCOUNT_SID'] ?? '',
      process.env['TWILIO_AUTH_TOKEN'] ?? '',
      workspace.twilioNumber,
    );

    const smsResult = await twilioClient.sendSMS(
      { to: lead.phone, body: messageBody, workspaceId, workspaceTimezone: timezone },
      this.prisma,
    );

    if (!smsResult.ok) {
      logger.error({ err: smsResult.error, leadId }, 'reactivation: SMS failed');
      return;
    }

    await this.prisma.lead.update({
      where: { id: leadId, workspaceId },
      data: {
        reactivationCount: { increment: 1 },
        lastReactivatedAt: new Date(),
        status: LeadStatus.REACTIVATED,
      },
    });

    const newStatus = transitionLead(lead.status, { type: 'REACTIVATE' }, { leadId, workspaceId });
    if (newStatus !== LeadStatus.REACTIVATED) {
      await this.prisma.lead.update({
        where: { id: leadId, workspaceId },
        data: { status: newStatus },
      });
    }

    await this.eventStore.append({
      leadId, workspaceId, type: 'lead.reactivated',
      payload: { reactivationCount: lead.reactivationCount + 1, messageBody },
      triggerSource: 'reactivation-processor',
    });

    await queues.leadIntake.add(
      'reactivated-lead',
      { leadId, workspaceId, source: 'REACTIVATION' },
      { removeOnComplete: 500, priority: 3 },
    ).catch((err: unknown) => logger.error({ err, leadId }, 'reactivation: lead-intake enqueue failed'));

    logger.info({ leadId, workspaceId, reactivationCount: lead.reactivationCount + 1 }, 'reactivation: message sent');
  }
}
