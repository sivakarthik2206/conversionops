import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import type { Workspace } from '@conversionops/db';
import { CreateWorkspaceCommand } from './create-workspace.command';

@Injectable()
export class CreateWorkspaceHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new workspace and assigns the requesting user as OWNER.
   * Checks slug uniqueness before creating.
   * @returns Result<Workspace> — never throws
   */
  async execute(cmd: CreateWorkspaceCommand): Promise<Result<Workspace>> {
    try {
      const existing = await this.prisma.workspace.findFirst({
        where: { slug: cmd.slug, deletedAt: null },
      });
      if (existing) {
        return { ok: false, error: new Error(`Slug "${cmd.slug}" is already taken`) };
      }

      const workspace = await this.prisma.workspace.create({
        data: {
          name: cmd.name,
          slug: cmd.slug,
          ownerEmail: cmd.ownerEmail,
          timezone: cmd.timezone,
          plan: cmd.plan,
          status: 'ONBOARDING',
          users: {
            create: {
              userId: cmd.ownerUserId,
              role: 'OWNER',
              isActive: true,
            },
          },
        },
      });

      await queues.auditLog
        .add(
          'workspace.created',
          {
            workspaceId: workspace.id,
            userId: cmd.ownerUserId,
            action: 'workspace.created',
            resource: 'workspace',
            resourceId: workspace.id,
            metadata: { slug: cmd.slug, plan: cmd.plan },
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: workspace };
    } catch (error) {
      logger.error({ err: error }, 'CreateWorkspaceHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
