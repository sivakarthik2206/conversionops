/**
 * Unit tests for NotificationService.
 * Verifies queue payloads and priority for agent/workspace/ops-alert notifications.
 */

import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '@conversionops/db';

function buildMockQueue() {
  return { add: jest.fn().mockResolvedValue(undefined) };
}

describe('NotificationService — notifyAgent()', () => {
  it('enqueues notify-agent job with correct payload', async () => {
    const queue = buildMockQueue();
    const svc = new NotificationService(queue as never);

    await svc.notifyAgent('agent-1', NotificationType.HOT_LEAD_ALERT, { leadId: 'lead-1' });

    expect(queue.add).toHaveBeenCalledWith(
      'notify-agent',
      expect.objectContaining({
        recipientWorkspaceUserId: 'agent-1',
        type: NotificationType.HOT_LEAD_ALERT,
        payload: { leadId: 'lead-1' },
        isOpsAlert: false,
      }),
      expect.any(Object),
    );
  });
});

describe('NotificationService — notifyWorkspace()', () => {
  it('enqueues notify-workspace job with workspaceId', async () => {
    const queue = buildMockQueue();
    const svc = new NotificationService(queue as never);

    await svc.notifyWorkspace('ws-1', NotificationType.APPOINTMENT_BOOKED, { leadId: 'lead-1' });

    expect(queue.add).toHaveBeenCalledWith(
      'notify-workspace',
      expect.objectContaining({
        workspaceId: 'ws-1',
        type: NotificationType.APPOINTMENT_BOOKED,
        isOpsAlert: false,
      }),
      expect.any(Object),
    );
  });
});

describe('NotificationService — sendOpsAlert()', () => {
  it('enqueues ops-alert job with OPS_ALERT type', async () => {
    const queue = buildMockQueue();
    const svc = new NotificationService(queue as never);

    await svc.sendOpsAlert('warn', 'Tenant leakage attempt', { workspaceId: 'ws-evil' });

    expect(queue.add).toHaveBeenCalledWith(
      'ops-alert',
      expect.objectContaining({
        type: NotificationType.OPS_ALERT,
        isOpsAlert: true,
        opsAlertLevel: 'warn',
        payload: expect.objectContaining({ message: 'Tenant leakage attempt' }),
      }),
      expect.any(Object),
    );
  });

  it('uses priority 1 for critical alerts', async () => {
    const queue = buildMockQueue();
    const svc = new NotificationService(queue as never);

    await svc.sendOpsAlert('critical', 'Database down', {});

    expect(queue.add).toHaveBeenCalledWith(
      'ops-alert',
      expect.objectContaining({ opsAlertLevel: 'critical' }),
      expect.objectContaining({ priority: 1 }),
    );
  });

  it('uses priority 5 for non-critical alerts', async () => {
    const queue = buildMockQueue();
    const svc = new NotificationService(queue as never);

    await svc.sendOpsAlert('info', 'Usage spike', {});

    expect(queue.add).toHaveBeenCalledWith(
      'ops-alert',
      expect.any(Object),
      expect.objectContaining({ priority: 5 }),
    );
  });
});
