import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import type { NotificationJobData } from '@conversionops/orchestration';
import { Channel, NotificationType, NotificationStatus, Prisma } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';
import { TwilioClient } from '@conversionops/integrations';
import { Resend } from 'resend';

@Injectable()
export class NotificationProcessor {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Processes notification jobs. Creates the Notification record and routes
   * to the appropriate delivery channel (SMS or Email) based on agent preference.
   */
  async process(job: Job<NotificationJobData>): Promise<void> {
    const data = job.data;

    let channel: Channel = Channel.SMS;
    let recipientPhone: string | undefined;
    let recipientEmail: string | undefined;

    if (data.recipientWorkspaceUserId) {
      const workspaceUser = await this.prisma.workspaceUser.findFirst({
        where: { id: data.recipientWorkspaceUserId, deletedAt: null },
        include: { user: true },
      });

      if (!workspaceUser) {
        logger.warn({ workspaceUserId: data.recipientWorkspaceUserId }, 'notification: workspace user not found');
        return;
      }

      channel = workspaceUser.notifyChannel;
      recipientPhone = workspaceUser.user.phone ?? undefined;
      recipientEmail = workspaceUser.user.email;
    }

    const body = this.buildNotificationBody(data);
    const notificationType = data.type as NotificationType;

    let notification = await this.prisma.notification.create({
      data: {
        workspaceId: data.workspaceId ?? 'ops',
        type: notificationType,
        status: NotificationStatus.PENDING,
        channel,
        recipientUserId: data.recipientWorkspaceUserId,
        recipientPhone,
        recipientEmail,
        body,
        metadata: (data.payload ?? {}) as Prisma.InputJsonValue,
      },
    });

    try {
      if (channel === Channel.SMS && recipientPhone) {
        const twilioClient = new TwilioClient(
          process.env['TWILIO_ACCOUNT_SID'] ?? '',
          process.env['TWILIO_AUTH_TOKEN'] ?? '',
          process.env['TWILIO_PHONE_NUMBER'] ?? '',
        );
        const smsResult = await twilioClient.sendSMS({
          to: recipientPhone as string,
          body,
          workspaceId: data.workspaceId ?? '',
        }, this.prisma);
        if (!smsResult.ok) {
          logger.warn({ err: smsResult.error, notificationId: notification.id }, 'notification: SMS delivery failed');
        }
      } else if (channel === Channel.EMAIL && recipientEmail) {
        const resend = new Resend(process.env['RESEND_API_KEY'] ?? '');
        await resend.emails.send({
          from: 'ConversionOps <notifications@conversionops.io>',
          to: recipientEmail,
          subject: data.type === NotificationType.AI_ESCALATION ? 'Escalation Alert — Action Required' : 'ConversionOps Notification',
          text: body,
        });
      }

      notification = await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });

      logger.info(
        { notificationId: notification.id, channel, type: data.type },
        'notification: delivered successfully',
      );
    } catch (err: unknown) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          failedAt: new Date(),
          failReason: err instanceof Error ? err.message : String(err),
        },
      });
      logger.error({ err, notificationId: notification.id }, 'notification: delivery failed');
      throw err;
    }
  }

  private buildNotificationBody(data: NotificationJobData): string {
    const payload = data.payload;
    switch (data.type as NotificationType) {
      case NotificationType.HOT_LEAD_ALERT:
        return `Hot lead alert: ${String(payload['leadName'] ?? 'Unknown')} (Score: ${String(payload['score'] ?? 0)})`;
      case NotificationType.APPOINTMENT_BOOKED:
        return `Appointment booked for ${String(payload['leadName'] ?? 'Unknown')}`;
      case NotificationType.AI_ESCALATION:
        return `AI escalation: ${String(payload['reason'] ?? 'Review required')}`;
      case NotificationType.MISSED_CALL_RECOVERY:
        return `Missed call from ${String(payload['phone'] ?? 'Unknown')}`;
      case NotificationType.OPS_ALERT:
        return `[OPS ${String(data.opsAlertLevel ?? 'info').toUpperCase()}] ${String(payload['message'] ?? '')}`;
      default:
        return `Notification: ${data.type}`;
    }
  }
}
