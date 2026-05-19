import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import { RoutingRule, Prisma, RoutingStrategy } from '@conversionops/db';

export interface CreateRoutingRuleInput {
  name: string;
  description?: string;
  strategy?: RoutingStrategy;
  priority?: number;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  expression?: string;
  targetUserIds?: string[];
}

export interface UpdateRoutingRuleInput {
  name?: string;
  description?: string;
  strategy?: RoutingStrategy;
  priority?: number;
  isActive?: boolean;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  expression?: string;
  targetUserIds?: string[];
}

@Injectable()
export class RoutingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists all active routing rules for a workspace, ordered by priority.
   * @param workspaceId - The workspace to scope to
   * @returns Result<RoutingRule[]>
   */
  async listRules(workspaceId: string): Promise<Result<RoutingRule[]>> {
    try {
      const rules = await this.prisma.routingRule.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { priority: 'desc' },
      });
      return { ok: true, value: rules };
    } catch (err) {
      logger.error({ err, workspaceId }, 'RoutingService.listRules error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Creates a new routing rule for a workspace.
   * @param workspaceId - The workspace scope
   * @param input - Rule configuration
   * @returns Result<RoutingRule>
   */
  async createRule(workspaceId: string, input: CreateRoutingRuleInput): Promise<Result<RoutingRule>> {
    try {
      const rule = await this.prisma.routingRule.create({
        data: {
          workspaceId,
          name: input.name,
          description: input.description,
          strategy: input.strategy ?? RoutingStrategy.ROUND_ROBIN,
          priority: input.priority ?? 0,
          conditions: (input.conditions ?? {}) as Prisma.InputJsonValue,
          actions: (input.actions ?? {}) as Prisma.InputJsonValue,
          expression: input.expression,
          targetUserIds: input.targetUserIds ?? [],
        },
      });
      return { ok: true, value: rule };
    } catch (err) {
      logger.error({ err, workspaceId }, 'RoutingService.createRule error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Updates a routing rule. Validates workspace ownership.
   * @param id - The routing rule id
   * @param workspaceId - The caller's workspace (must own the rule)
   * @param input - Fields to update
   * @returns Result<RoutingRule>
   */
  async updateRule(
    id: string,
    workspaceId: string,
    input: UpdateRoutingRuleInput,
  ): Promise<Result<RoutingRule>> {
    try {
      const existing = await this.prisma.routingRule.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) return { ok: false, error: new Error('Routing rule not found') };
      if (existing.workspaceId !== workspaceId) {
        throw new TenantLeakageError(id, workspaceId);
      }

      const rule = await this.prisma.routingRule.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.strategy !== undefined && { strategy: input.strategy }),
          ...(input.priority !== undefined && { priority: input.priority }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.conditions !== undefined && { conditions: input.conditions as Prisma.InputJsonValue }),
          ...(input.actions !== undefined && { actions: input.actions as Prisma.InputJsonValue }),
          ...(input.expression !== undefined && { expression: input.expression }),
          ...(input.targetUserIds !== undefined && { targetUserIds: input.targetUserIds }),
        },
      });
      return { ok: true, value: rule };
    } catch (err) {
      if (err instanceof TenantLeakageError) throw err;
      logger.error({ err, id, workspaceId }, 'RoutingService.updateRule error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Soft-deletes a routing rule. Validates workspace ownership.
   * @param id - The routing rule id
   * @param workspaceId - The caller's workspace (must own the rule)
   * @returns Result<RoutingRule>
   */
  async deleteRule(id: string, workspaceId: string): Promise<Result<RoutingRule>> {
    try {
      const existing = await this.prisma.routingRule.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) return { ok: false, error: new Error('Routing rule not found') };
      if (existing.workspaceId !== workspaceId) {
        throw new TenantLeakageError(id, workspaceId);
      }

      const rule = await this.prisma.routingRule.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      return { ok: true, value: rule };
    } catch (err) {
      if (err instanceof TenantLeakageError) throw err;
      logger.error({ err, id, workspaceId }, 'RoutingService.deleteRule error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
