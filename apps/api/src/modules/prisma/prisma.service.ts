import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@conversionops/db';
import { logger } from '@conversionops/observability';

// Models that are global (no workspaceId) or have workspaceId as optional
const TENANT_EXEMPT_MODELS = new Set([
  'User',
  'Workspace',
  'IdempotencyKey',
  'OperationalMetric', // platform-wide metrics can have null workspaceId
]);

// Write operations require workspaceId — fail hard to prevent cross-tenant writes
const SCOPED_WRITE_ACTIONS = new Set([
  'update', 'updateMany', 'delete', 'deleteMany', 'create', 'createMany', 'upsert',
]);

// Read operations require workspaceId — log warning (don't throw to allow admin queries)
const SCOPED_READ_ACTIONS = new Set(['findMany', 'aggregate', 'groupBy', 'count']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    this.$use(async (params, next) => {
      const { model, action, args } = params;

      if (!model || TENANT_EXEMPT_MODELS.has(model)) {
        return next(params);
      }

      const where = (args as Record<string, unknown>)?.where as Record<string, unknown> | undefined;
      const data = (args as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      // create/upsert ops have workspaceId in data not where
      const hasWorkspaceScope = where?.workspaceId !== undefined || data?.workspaceId !== undefined;

      if (SCOPED_WRITE_ACTIONS.has(action) && !hasWorkspaceScope) {
        // Hard fail on unscoped writes — this is a critical security invariant
        const err = new Error(`UnscopedQueryError: Missing workspaceId in ${model}.${action}`);
        logger.error({ model, action }, 'SECURITY: unscoped write query rejected');
        throw err;
      }

      if (SCOPED_READ_ACTIONS.has(action) && !hasWorkspaceScope) {
        // Warn but allow — admin routes legitimately query across workspaces
        logger.warn({ model, action }, 'Cross-tenant read detected — verify this is intentional');
      }

      return next(params);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    logger.info('Prisma: database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    logger.info('Prisma: database connection closed');
  }
}
