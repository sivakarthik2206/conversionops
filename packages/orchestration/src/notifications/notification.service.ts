import { Queue } from 'bullmq';
import { NotificationType } from '@conversionops/db';

export type OpsAlertLevel = 'info' | 'warn' | 'error' | 'critical';

export interface NotificationJobPayload {
  workspaceId?: string;
  recipientWorkspaceUserId?: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  isOpsAlert?: boolean;
  opsAlertLevel?: OpsAlertLevel;
}

export class NotificationService {
  constructor(private readonly notificationQueue: Queue) {}

  /**
   * Enqueues a notification for a specific agent (WorkspaceUser).
   * @param workspaceUserId - The WorkspaceUser to notify
   * @param type - Notification type
   * @param payload - Additional context
   */
  async notifyAgent(
    workspaceUserId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.notificationQueue.add(
      'notify-agent',
      {
        recipientWorkspaceUserId: workspaceUserId,
        type,
        payload,
        isOpsAlert: false,
      } satisfies NotificationJobPayload,
      { removeOnComplete: 1000 },
    );
  }

  /**
   * Enqueues a notification for all active users in a workspace.
   * @param workspaceId - The workspace to notify
   * @param type - Notification type
   * @param payload - Additional context
   */
  async notifyWorkspace(
    workspaceId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.notificationQueue.add(
      'notify-workspace',
      {
        workspaceId,
        type,
        payload,
        isOpsAlert: false,
      } satisfies NotificationJobPayload,
      { removeOnComplete: 1000 },
    );
  }

  /**
   * Enqueues an ops-team alert. Used for platform-level issues like tenant leakage attempts.
   * @param level - Alert severity level
   * @param message - Human-readable alert message
   * @param context - Structured context for the alert
   */
  async sendOpsAlert(
    level: OpsAlertLevel,
    message: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    await this.notificationQueue.add(
      'ops-alert',
      {
        type: NotificationType.OPS_ALERT,
        payload: { message, context },
        isOpsAlert: true,
        opsAlertLevel: level,
      } satisfies NotificationJobPayload,
      { removeOnComplete: 1000, priority: level === 'critical' ? 1 : 5 },
    );
  }
}
