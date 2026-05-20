import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import type { AppointmentBookingJobData } from '@conversionops/orchestration';
import { CalComClient } from '@conversionops/integrations';
import { MessageRole, NotificationType } from '@conversionops/db';
import { isQuietHours, validateConsent } from '@conversionops/compliance';
import { TwilioClient } from '@conversionops/integrations';
import { queues, NotificationService } from '@conversionops/orchestration';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RealtimeEmitterService } from '../modules/realtime/realtime-emitter.service';

@Injectable()
export class AppointmentBookingProcessor {
  private readonly notificationService: NotificationService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {
    this.notificationService = new NotificationService(queues.notification);
  }

  /**
   * Sends a personalised Cal.com booking link to the lead via SMS.
   * Checks TCPA consent and quiet hours before sending.
   */
  async process(job: Job<AppointmentBookingJobData>): Promise<void> {
    const { leadId, workspaceId, conversationId } = job.data;

    try {
      const [lead, workspace] = await Promise.all([
        this.prisma.lead.findFirst({ where: { id: leadId, workspaceId, deletedAt: null } }),
        this.prisma.workspace.findUnique({ where: { id: workspaceId } }),
      ]);

      if (!lead || !workspace) {
        logger.warn({ leadId, workspaceId }, 'appointment-booking: lead or workspace not found');
        return;
      }

      if (!lead.phone) {
        logger.warn({ leadId }, 'appointment-booking: lead has no phone, cannot send booking link');
        return;
      }

      if (isQuietHours(workspace.timezone)) {
        logger.info({ workspaceId, leadId }, 'appointment-booking: quiet hours, deferring');
        return;
      }

      const hasConsent = await validateConsent(lead.phone, workspaceId, this.prisma);
      if (!hasConsent) {
        logger.warn({ leadId, phone: lead.phone }, 'appointment-booking: no TCPA consent, skipping');
        return;
      }

      const config = workspace.aiConfig as Record<string, unknown>;
      const calcomApiKey = config?.['calcomApiKey'] as string | undefined;
      const calcomEventTypeId = config?.['calcomEventTypeId'] as number | undefined;

      let bookingLink = config?.['defaultBookingLink'] as string | undefined;

      if (calcomEventTypeId) {
        const calClient = new CalComClient(calcomApiKey ?? '');
        const link = calClient.createBookingLink(calcomEventTypeId, {
          name: lead.name ?? 'Lead',
          email: lead.email ?? '',
          phone: lead.phone ?? undefined,
        });
        bookingLink = link;
      }

      if (!bookingLink) {
        logger.warn({ leadId, workspaceId }, 'appointment-booking: no booking link available');
        return;
      }

      const agentName = (config?.['agentName'] as string | undefined) ?? workspace.name;
      const messageBody = `Hi! ${agentName} here — I'd love to connect. Book a quick call: ${bookingLink}`;

      const twilio = new TwilioClient(
        process.env['TWILIO_ACCOUNT_SID'] ?? '',
        process.env['TWILIO_AUTH_TOKEN'] ?? '',
        workspace.twilioNumber ?? process.env['TWILIO_PHONE_NUMBER'] ?? '',
      );

      const smsResult = await twilio.sendSMS({ to: lead.phone, body: messageBody, workspaceId }, this.prisma);

      if (smsResult.ok && conversationId) {
        await this.prisma.message.create({
          data: {
            workspaceId,
            conversationId,
            role: MessageRole.AI,
            content: messageBody,
            providerMessageId: smsResult.value,
          },
        });

        this.realtimeEmitter.emitToWorkspace(workspaceId, 'message:new', {
          conversationId,
          role: 'AI',
          content: messageBody,
        });
      }

      if (!smsResult.ok) {
        logger.error({ err: smsResult.error, leadId }, 'appointment-booking: SMS failed');
      } else {
        logger.info({ leadId, workspaceId }, 'appointment-booking: booking link sent');
      }
    } catch (err) {
      logger.error({ err, leadId, workspaceId }, 'appointment-booking: processing error');
      throw err;
    }
  }
}
