import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { NotificationType, NotificationStatus } from '@conversionops/db';
import type { Prisma } from '@conversionops/db';
import { TwilioClient, ResendClient } from '@conversionops/integrations';
import { ConsentChannel } from '@conversionops/db';
import type { NotificationJobData } from '@conversionops/orchestration';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class NotificationProcessor {
  private readonly twilio: TwilioClient;
  private readonly resend: ResendClient;

  constructor(private readonly prisma: PrismaService) {
    this.twilio = new TwilioClient(
      process.env['TWILIO_ACCOUNT_SID'] ?? '',
      process.env['TWILIO_AUTH_TOKEN'] ?? '',
      process.env['TWILIO_PHONE_NUMBER'] ?? '',
    );
    this.resend = new ResendClient(process.env['RESEND_API_KEY'] ?? '');
  }

  /**
   * Routes notification jobs to SMS or email based on agent preferences.
   * Handles workspace-level notifications by loading all active agents.
   * Never throws — all errors are logged and swallowed.
   */
  async process(job: Job<NotificationJobData>): Promise<void> {
    const { type, payload, workspaceId, recipientWorkspaceUserId } = job.data;

    try {
      if (recipientWorkspaceUserId) {
        await this.notifyAgent(recipientWorkspaceUserId, type as NotificationType, payload, workspaceId);
      } else if (workspaceId) {
        const agents = await this.prisma.workspaceUser.findMany({
          where: { workspaceId, isActive: true, deletedAt: null },
          include: { user: { select: { email: true } } },
        });
        await Promise.allSettled(
          agents.map((agent) => this.notifyAgent(agent.id, type as NotificationType, payload, workspaceId)),
        );
      }
    } catch (err) {
      logger.error({ err, jobId: job.id, type }, 'notification-processor: unhandled error');
    }
  }

  private async notifyAgent(
    workspaceUserId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
    workspaceId?: string,
  ): Promise<void> {
    const workspaceUser = await this.prisma.workspaceUser.findFirst({
      where: { id: workspaceUserId, isActive: true, deletedAt: null },
      include: { user: { select: { email: true, phone: true } } },
    });

    if (!workspaceUser) {
      logger.warn({ workspaceUserId }, 'notification-processor: agent not found');
      return;
    }

    const notifyChannel = workspaceUser.notifyChannel ?? 'EMAIL';
    const message = buildNotificationMessage(type, payload);
    const wid = workspaceId ?? workspaceUser.workspaceId;

    let notificationRecord: { id: string } | null = null;

    try {
      notificationRecord = await this.prisma.notification.create({
        data: {
          workspaceId: wid,
          type,
          channel: notifyChannel === 'SMS' ? 'SMS' : 'EMAIL',
          status: NotificationStatus.PENDING,
          body: message,
          metadata: payload as unknown as Prisma.InputJsonValue,
          recipientUserId: workspaceUser.userId,
          recipientEmail: workspaceUser.user.email ?? undefined,
          recipientPhone: workspaceUser.user.phone ?? undefined,
        },
        select: { id: true },
      });
    } catch (err) {
      logger.warn({ err }, 'notification-processor: failed to create notification record');
    }

    let sent = false;

    if (notifyChannel === 'SMS' && workspaceUser.user.phone) {
      const smsResult = await this.twilio.sendSMS(
        {
          to: workspaceUser.user.phone,
          body: message,
          workspaceId: wid,
          purpose: 'internal',
        },
        this.prisma,
      );
      sent = smsResult.ok;
      if (!smsResult.ok) {
        logger.warn({ err: smsResult.error, workspaceUserId }, 'notification-processor: SMS failed, falling back to email');
      }
    }

    if (!sent && workspaceUser.user.email) {
      const emailResult = await this.resend.sendEmail(
        workspaceUser.user.email,
        buildEmailSubject(type),
        `<p>${message}</p>`,
      );
      sent = emailResult.ok;
      if (!emailResult.ok) {
        logger.error({ err: emailResult.error, workspaceUserId }, 'notification-processor: email failed');
      }
    }

    if (notificationRecord) {
      await this.prisma.notification.update({
        where: { id: notificationRecord.id },
        data: {
          status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: sent ? new Date() : undefined,
        },
      });
    }
  }
}

function buildNotificationMessage(type: NotificationType, payload: Record<string, unknown>): string {
  switch (type) {
    case NotificationType.HOT_LEAD_ALERT:
      return `🔥 Hot lead alert! A lead has scored ${String(payload['score'] ?? '')} — check ConversionOps now.`;
    case NotificationType.APPOINTMENT_BOOKED:
      return `📅 Appointment booked with ${String(payload['leadName'] ?? 'a lead')} — check your calendar.`;
    case NotificationType.AI_ESCALATION:
      return `⚠️ Lead requires human attention: ${String(payload['reason'] ?? 'escalation trigger')}`;
    case NotificationType.MISSED_CALL_RECOVERY:
      return `📞 Missed call recovered — AI reached out to ${String(payload['phone'] ?? 'the caller')}.`;
    case NotificationType.REACTIVATION_SUCCESS:
      return `✅ Dormant lead reactivated and responding.`;
    case NotificationType.QUOTA_WARNING:
      return `⚠️ AI token quota at ${String(payload['percentUsed'] ?? '')}% — consider upgrading.`;
    case NotificationType.BILLING_ALERT:
      return `💳 Billing action required on your ConversionOps account.`;
    case NotificationType.OPS_ALERT:
      return `🚨 [OPS] ${String(payload['message'] ?? 'System alert')}`;
    default:
      return `ConversionOps notification: ${type}`;
  }
}

function buildEmailSubject(type: NotificationType): string {
  const subjects: Partial<Record<NotificationType, string>> = {
    [NotificationType.HOT_LEAD_ALERT]: '[ConversionOps] Hot Lead Alert',
    [NotificationType.APPOINTMENT_BOOKED]: '[ConversionOps] Appointment Booked',
    [NotificationType.AI_ESCALATION]: '[ConversionOps] Lead Needs Attention',
    [NotificationType.MISSED_CALL_RECOVERY]: '[ConversionOps] Missed Call Recovered',
    [NotificationType.QUOTA_WARNING]: '[ConversionOps] AI Token Quota Warning',
    [NotificationType.BILLING_ALERT]: '[ConversionOps] Billing Alert',
    [NotificationType.OPS_ALERT]: '[ConversionOps] Operations Alert',
  };
  return subjects[type] ?? '[ConversionOps] Notification';
}
