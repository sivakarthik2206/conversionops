import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues } from '@conversionops/orchestration';
import type { AppointmentBookingJobData } from '@conversionops/orchestration';
import { TwilioClient, CalComClient } from '@conversionops/integrations';
import { ConversationStatus } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class AppointmentBookingProcessor {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sends a booking link to a lead when qualification detects shouldBook=true.
   * Uses Cal.com link if configured, otherwise a plain text invitation.
   */
  async process(job: Job<AppointmentBookingJobData>): Promise<void> {
    const { leadId, workspaceId, conversationId } = job.data;

    const [lead, workspace] = await Promise.all([
      this.prisma.lead.findFirst({ where: { id: leadId, workspaceId, deletedAt: null } }),
      this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null } }),
    ]);

    if (!lead || !workspace || !lead.phone || !workspace.twilioNumber) {
      logger.warn({ leadId, workspaceId }, 'appointment-booking: missing lead/workspace/phone, skipping');
      return;
    }

    const aiConfig = workspace.aiConfig as Record<string, unknown>;
    const agentName = typeof aiConfig['agentName'] === 'string' ? aiConfig['agentName'] : 'our team';
    const calApiKey = typeof aiConfig['calComApiKey'] === 'string' ? aiConfig['calComApiKey'] : null;
    const calEventTypeId = typeof aiConfig['calComEventTypeId'] === 'number' ? aiConfig['calComEventTypeId'] : null;

    const twilioClient = new TwilioClient(
      process.env['TWILIO_ACCOUNT_SID'] ?? '',
      process.env['TWILIO_AUTH_TOKEN'] ?? '',
      workspace.twilioNumber,
    );

    let messageBody: string;

    if (calApiKey && calEventTypeId) {
      const calClient = new CalComClient(calApiKey);
      const bookingLink = calClient.createBookingLink(calEventTypeId, {
        name: lead.name ?? undefined,
        email: lead.email ?? undefined,
        phone: lead.phone,
      });
      messageBody = `Great! Here is a link to book directly with ${agentName}: ${bookingLink} — takes 30 seconds.`;
    } else {
      messageBody = `I would love to schedule a showing for you — reply with your preferred day and time and ${agentName} will reach out to confirm.`;
    }

    const smsResult = await twilioClient.sendSMS(
      { to: lead.phone, body: messageBody, workspaceId, workspaceTimezone: workspace.timezone },
      this.prisma,
    );

    if (!smsResult.ok) {
      logger.error({ err: smsResult.error, leadId }, 'appointment-booking: SMS send failed');
      return;
    }

    if (conversationId) {
      await this.prisma.conversation.update({
        where: { id: conversationId, workspaceId },
        data: { status: ConversationStatus.APPOINTMENT_PENDING },
      });
    }

    // 24-hour follow-up reminder
    await queues.appointmentBooking
      .add(
        'booking-reminder',
        { leadId, workspaceId, conversationId },
        { delay: 86_400_000, removeOnComplete: 100 },
      )
      .catch((err: unknown) => logger.warn({ err, leadId }, 'appointment-booking: reminder enqueue failed'));

    logger.info({ leadId, workspaceId }, 'appointment-booking: booking message sent');
  }
}
