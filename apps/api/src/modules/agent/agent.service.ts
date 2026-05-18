import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { WorkspaceUser } from '@conversionops/db';

export interface InviteAgentInput {
  workspaceId: string,
  invitedByUserId: string,
  email: string,
  role: 'ADMIN' | 'AGENT' | 'VIEWER',
  displayName?: string,
}

export interface UpdateAgentInput {
  workspaceUserId: string,
  workspaceId: string,
  updatedByUserId: string,
  role?: 'ADMIN' | 'AGENT' | 'VIEWER',
  displayName?: string,
  isAvailable?: boolean,
}

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists all active agents in a workspace.
   */
  async listAgents(workspaceId: string): Promise<Result<WorkspaceUser[]>> {
    try {
      const agents = await this.prisma.workspaceUser.findMany({
        where: { workspaceId, isActive: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      return { ok: true, value: agents };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Invites an agent to the workspace. Creates User if not exists, then WorkspaceUser.
   */
  async inviteAgent(input: InviteAgentInput): Promise<Result<WorkspaceUser>> {
    try {
      const user = await this.prisma.user.upsert({
        where: { email: input.email },
        update: {},
        create: { email: input.email },
      });

      const existing = await this.prisma.workspaceUser.findUnique({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: user.id } },
      });
      if (existing) {
        return { ok: false, error: new Error('Agent already belongs to this workspace') };
      }

      const workspaceUser = await this.prisma.workspaceUser.create({
        data: {
          workspaceId: input.workspaceId,
          userId: user.id,
          role: input.role,
          displayName: input.displayName,
          isActive: true,
        },
      });

      await queues.auditLog
        .add('agent.invited', { workspaceId: input.workspaceId, userId: input.invitedByUserId, action: 'agent.invited', resource: 'workspace_user', resourceId: workspaceUser.id }, { removeOnComplete: 1000 })
        .catch((err: unknown) => logger.error({ err }, 'Audit log failed'));

      return { ok: true, value: workspaceUser };
    } catch (error) {
      logger.error({ err: error }, 'AgentService.inviteAgent error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Updates an agent's role or availability. Scoped to workspaceId.
   */
  async updateAgent(input: UpdateAgentInput): Promise<Result<WorkspaceUser>> {
    try {
      const existing = await this.prisma.workspaceUser.findFirst({
        where: { id: input.workspaceUserId, workspaceId: input.workspaceId, deletedAt: null },
      });
      if (!existing) {
        return { ok: false, error: new TenantLeakageError(input.workspaceUserId, input.workspaceId) };
      }

      const updated = await this.prisma.workspaceUser.update({
        where: { id: input.workspaceUserId },
        data: {
          ...(input.role && { role: input.role }),
          ...(input.displayName && { displayName: input.displayName }),
          ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
        },
      });

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'AgentService.updateAgent error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Soft-deletes an agent from the workspace (sets isActive=false, deletedAt).
   */
  async deleteAgent(workspaceUserId: string, workspaceId: string, deletedByUserId: string): Promise<Result<void>> {
    try {
      const existing = await this.prisma.workspaceUser.findFirst({
        where: { id: workspaceUserId, workspaceId, deletedAt: null },
      });
      if (!existing) {
        return { ok: false, error: new TenantLeakageError(workspaceUserId, workspaceId) };
      }

      await this.prisma.workspaceUser.update({
        where: { id: workspaceUserId },
        data: { isActive: false, deletedAt: new Date() },
      });

      await queues.auditLog
        .add('agent.removed', { workspaceId, userId: deletedByUserId, action: 'agent.removed', resource: 'workspace_user', resourceId: workspaceUserId }, { removeOnComplete: 1000 })
        .catch((err: unknown) => logger.error({ err }, 'Audit log failed'));

      return { ok: true, value: undefined };
    } catch (error) {
      logger.error({ err: error }, 'AgentService.deleteAgent error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
