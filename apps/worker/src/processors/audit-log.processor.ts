import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, NotificationService } from '@conversionops/orchestration';
import type { AuditLogJobData } from '@conversionops/orchestration';
import { NotificationType, Prisma } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class AuditLogProcessor {
  private readonly notificationService: NotificationService;

  constructor(private readonly prisma: PrismaService) {
    this.notificationService = new NotificationService(queues.notification);
  }

  /**
   * Processes audit-log jobs. Writes the AuditLog record to the database.
   * Never throws — audit logging must never affect the main flow.
   */
  async process(job: Job<AuditLogJobData>): Promise<void> {
    try {
      const data = job.data;

      await this.prisma.auditLog.create({
        data: {
          workspaceId: data.workspaceId,
          userId: data.userId,
          role: data.role,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          oldValue: data.oldValue as Prisma.InputJsonValue | undefined,
          newValue: data.newValue as Prisma.InputJsonValue | undefined,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          requestId: data.requestId,
        },
      });

      if (data.action.includes('tenant_leakage')) {
        await this.notificationService
          .sendOpsAlert('critical', 'Tenant leakage attempt detected', {
            action: data.action,
            workspaceId: data.workspaceId,
            userId: data.userId,
            resourceId: data.resourceId,
            requestId: data.requestId,
          })
          .catch((err: unknown) => logger.error({ err }, 'audit-log: ops alert enqueue failed'));
      }
    } catch (err: unknown) {
      logger.error({ err, jobId: job.id, action: job.data.action }, 'audit-log: failed to write record');
    }
  }
}
