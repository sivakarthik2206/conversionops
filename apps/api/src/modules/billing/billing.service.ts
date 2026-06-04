/**
 * Stripe has been replaced by Paddle.
 * This file is kept as a stub to avoid breaking any imports.
 * Use PaddleService for all billing operations.
 */
import { Injectable } from '@nestjs/common';
import { logger } from '@conversionops/observability';
import { PrismaService } from '../prisma/prisma.service';
import type { Result } from '@conversionops/types';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /** @deprecated Stripe removed. Use PaddleService. */
  isStripeConfigured(): boolean {
    return false;
  }

  /** Returns current token usage stats for a workspace. */
  async getUsage(workspaceId: string): Promise<Result<{ used: number; limit: number; percentUsed: number }>> {
    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) return { ok: false, error: new Error('Workspace not found') };
      const used = workspace.tokenUsageCurrentMonth;
      const limit = workspace.tokenQuotaMonthly;
      return { ok: true, value: { used, limit, percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0 } };
    } catch (error) {
      logger.error({ err: error, workspaceId }, 'BillingService.getUsage error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
