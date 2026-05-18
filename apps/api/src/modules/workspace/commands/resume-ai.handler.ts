import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import type { Workspace } from '@conversionops/db';

export class ResumeAICommand {
  constructor(
    public readonly workspaceId: string,
    public readonly resumedBy: string,
  ) {}
}

@Injectable()
export class ResumeAIHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resumes AI for the workspace, clearing all pause fields.
   * @returns Result<Workspace> — never throws
   */
  async execute(cmd: ResumeAICommand): Promise<Result<Workspace>> {
    try {
      const workspace = await this.prisma.workspace.update({
        where: { id: cmd.workspaceId },
        data: {
          aiPaused: false,
          aiPausedAt: null,
          aiPausedBy: null,
          aiPauseReason: null,
        },
      });

      await queues.auditLog
        .add(
          'workspace.ai.resumed',
          {
            workspaceId: cmd.workspaceId,
            userId: cmd.resumedBy,
            action: 'workspace.ai.resumed',
            resource: 'workspace',
            resourceId: cmd.workspaceId,
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: workspace };
    } catch (error) {
      logger.error({ err: error }, 'ResumeAIHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
