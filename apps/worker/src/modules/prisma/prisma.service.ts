import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@conversionops/db';
import { logger } from '@conversionops/observability';

const TENANT_EXEMPT_MODELS = new Set([
  'User',
  'Workspace',
  'IdempotencyKey',
  'OperationalMetric',
]);

const SCOPED_WRITE_ACTIONS = new Set([
  'update', 'updateMany', 'delete', 'deleteMany', 'create', 'createMany', 'upsert',
]);

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

      if (SCOPED_WRITE_ACTIONS.has(action) && where?.workspaceId === undefined) {
        const err = new Error(`UnscopedQueryError: Missing workspaceId in ${model}.${action}`);
        logger.error({ model, action }, 'SECURITY: unscoped write query rejected in worker');
        throw err;
      }

      return next(params);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    logger.info('Worker Prisma: database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    logger.info('Worker Prisma: database connection closed');
  }
}
