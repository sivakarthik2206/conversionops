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
      const aiConfigUpdates: Record<string, unknown> = {};
      if (cmd.data.followUpBossApiKey !== undefined) aiConfigUpdates['followUpBossApiKey'] = cmd.data.followUpBossApiKey;
      if (cmd.data.calComUsername !== undefined) aiConfigUpdates['calComUsername'] = cmd.data.calComUsername;
      if (cmd.data.calComLink !== undefined) aiConfigUpdates['calComLink'] = cmd.data.calComLink;

      let mergedAiConfig: Record<string, unknown> | undefined;
      if (cmd.data.aiConfig !== undefined || Object.keys(aiConfigUpdates).length > 0) {
        const existing = await this.prisma.workspace.findUnique({ where: { id: cmd.workspaceId }, select: { aiConfig: true } });
        const base = (existing?.aiConfig as Record<string, unknown>) ?? {};
        mergedAiConfig = { ...base, ...cmd.data.aiConfig, ...aiConfigUpdates };
      }

      const workspace = await this.prisma.workspace.update({
        where: { id: cmd.workspaceId },
        data: {
          ...(cmd.data.name && { name: cmd.data.name }),
          ...(cmd.data.timezone && { timezone: cmd.data.timezone }),
          ...(mergedAiConfig !== undefined && { aiConfig: mergedAiConfig as Record<string, never> }),
          ...(cmd.data.twilioNumber !== undefined && { twilioNumber: cmd.data.twilioNumber }),
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
