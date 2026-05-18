import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import type { Workspace } from '@conversionops/db';
import { UpdateWorkspaceCommand } from './update-workspace.command';

@Injectable()
export class UpdateWorkspaceHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Updates name, timezone, or aiConfig for a workspace, scoped by workspaceId.
   * @returns Result<Workspace> — never throws
   */
  async execute(cmd: UpdateWorkspaceCommand): Promise<Result<Workspace>> {
    try {
      const workspace = await this.prisma.workspace.update({
        where: { id: cmd.workspaceId },
        data: {
          ...(cmd.data.name && { name: cmd.data.name }),
          ...(cmd.data.timezone && { timezone: cmd.data.timezone }),
          ...(cmd.data.aiConfig !== undefined && { aiConfig: cmd.data.aiConfig as Record<string, never> }),
        },
      });

      await queues.auditLog
        .add(
          'workspace.updated',
          {
            workspaceId: cmd.workspaceId,
            userId: cmd.userId,
            action: 'workspace.updated',
            resource: 'workspace',
            resourceId: cmd.workspaceId,
            metadata: { fields: Object.keys(cmd.data) },
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: workspace };
    } catch (error) {
      logger.error({ err: error }, 'UpdateWorkspaceHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
