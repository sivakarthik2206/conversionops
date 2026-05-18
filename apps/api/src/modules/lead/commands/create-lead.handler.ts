import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import type { Lead } from '@conversionops/db';
import { CreateLeadCommand } from './create-lead.command';

@Injectable()
export class CreateLeadHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new lead. Checks externalId uniqueness per workspace.
   * Enqueues lead-intake job for AI processing.
   * @returns Result<Lead> — never throws
   */
  async execute(cmd: CreateLeadCommand): Promise<Result<Lead>> {
    try {
      if (cmd.externalId) {
        const existing = await this.prisma.lead.findFirst({
          where: { workspaceId: cmd.workspaceId, externalId: cmd.externalId, deletedAt: null },
        });
        if (existing) return { ok: true, value: existing };
      }

      const lead = await this.prisma.lead.create({
        data: {
          workspaceId: cmd.workspaceId,
          source: cmd.source as Lead['source'],
          status: 'NEW',
          tier: 'UNQUALIFIED',
          name: cmd.name,
          phone: cmd.phone,
          email: cmd.email,
          externalId: cmd.externalId,
          sourcePayload: (cmd.sourcePayload ?? {}) as Record<string, never>,
        },
      });

      await queues.leadIntake
        .add(
          'new-lead',
          { leadId: lead.id, workspaceId: cmd.workspaceId },
          { removeOnComplete: 500, priority: 1 },
        )
        .catch((err: unknown) => logger.error({ err }, 'lead-intake enqueue failed'));

      await queues.auditLog
        .add(
          'lead.created',
          {
            workspaceId: cmd.workspaceId,
            userId: cmd.createdByUserId,
            action: 'lead.created',
            resource: 'lead',
            resourceId: lead.id,
            metadata: { source: cmd.source },
          },
          { removeOnComplete: 1000 },
        )
        .catch((err: unknown) => logger.error({ err }, 'Audit log enqueue failed'));

      return { ok: true, value: lead };
    } catch (error) {
      logger.error({ err: error }, 'CreateLeadHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
