import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import type { Workspace } from '@conversionops/db';

export class PauseAICommand {
  constructor(
    public readonly workspaceId: string,
    public readonly pausedBy: string,
    public readonly reason?: string,
  ) {}
}

@Injectable()
export class PauseAIHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pauses AI for the workspace. Records who paused and when.
   * @returns Result<Workspace> — never throws
   */
  async execute(cmd: PauseAICommand): Promise<Result<Workspace>> {
    try {
      const workspace = await this.prisma.workspace.update({
        where: { id: cmd.workspaceId },
        data: {
          aiPaused: true,
          aiPausedAt: new Date(),
          aiPausedBy: cmd.pausedBy,
          aiPauseReason: cmd.reason ?? null,
        },
      });

      await queues.auditLog
        .add(
          'workspace.ai.paused',
          {
            workspaceId: cmd.workspaceId,
            userId: cmd.pausedBy,
            action: 'workspace.ai.paused',
            resource: 'workspace',
            resourceId: cmd.workspaceId,
            metadata: { reason: cmd.reason },
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: workspace };
    } catch (error) {
      logger.error({ err: error }, 'PauseAIHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
