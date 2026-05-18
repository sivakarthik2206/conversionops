import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Lead } from '@conversionops/db';
import { AssignLeadCommand } from './assign-lead.command';

@Injectable()
export class AssignLeadHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assigns a lead to an agent. Verifies agent belongs to same workspace.
   * Creates LeadAssignment record and notifies the agent.
   * @returns Result<Lead> — never throws
   */
  async execute(cmd: AssignLeadCommand): Promise<Result<Lead>> {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id: cmd.leadId, workspaceId: cmd.workspaceId, deletedAt: null },
      });
      if (!lead) {
        return { ok: false, error: new TenantLeakageError(cmd.leadId, cmd.workspaceId) };
      }

      const targetAgent = await this.prisma.workspaceUser.findFirst({
        where: { id: cmd.targetWorkspaceUserId, workspaceId: cmd.workspaceId, isActive: true },
      });
      if (!targetAgent) {
        return { ok: false, error: new TenantLeakageError(cmd.targetWorkspaceUserId, cmd.workspaceId) };
      }

      await this.prisma.leadAssignment.updateMany({
        where: { leadId: cmd.leadId, workspaceId: cmd.workspaceId, isPrimary: true, releasedAt: null },
        data: { isPrimary: false, releasedAt: new Date() },
      });

      await this.prisma.leadAssignment.create({
        data: {
          workspaceId: cmd.workspaceId,
          leadId: cmd.leadId,
          workspaceUserId: cmd.targetWorkspaceUserId,
          isPrimary: true,
          routingReason: cmd.routingReason,
        },
      });

      const updatedLead = await this.prisma.lead.update({
        where: { id: cmd.leadId },
        data: { assignedWorkspaceUserId: cmd.targetWorkspaceUserId, status: 'ASSIGNED' },
      });

      await queues.notification
        .add(
          'agent-assigned',
          {
            workspaceId: cmd.workspaceId,
            workspaceUserId: cmd.targetWorkspaceUserId,
            leadId: cmd.leadId,
            type: 'HOT_LEAD_ALERT',
          },
          { removeOnComplete: 500 },
        )
        .catch((err: unknown) => logger.error({ err }, 'notification enqueue failed'));

      await queues.auditLog
        .add(
          'lead.assigned',
          {
            workspaceId: cmd.workspaceId,
            userId: cmd.assignedByUserId,
            action: 'lead.assigned',
            resource: 'lead',
            resourceId: cmd.leadId,
            metadata: { assignedTo: cmd.targetWorkspaceUserId },
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: updatedLead };
    } catch (error) {
      logger.error({ err: error }, 'AssignLeadHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
