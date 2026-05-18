import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Lead } from '@conversionops/db';
import { QualifyLeadCommand } from './qualify-lead.command';

/** Minimal scoring logic — Phase 5 replaces with full lead-scorer. */
function calculateScore(qualification: Record<string, unknown>): { score: number; tier: string } {
  let score = 0;
  const q = qualification;

  if (q['timeline'] === '30_days') score += 30;
  else if (q['timeline'] === '90_days') score += 20;
  else if (q['timeline'] === '6_months') score += 10;

  if (q['financing'] === 'pre_approved' || q['financing'] === 'cash') score += 25;
  else if (q['financing'] === 'needs_financing') score += 10;

  const budget = Number(q['budget'] ?? 0);
  if (budget > 500000) score += 20;
  else if (budget > 300000) score += 15;
  else if (budget > 100000) score += 8;
  else if (budget > 0) score += 3;

  if (q['urgency'] === 'immediate') score += 15;
  else if (q['urgency'] === 'near_term') score += 8;

  let tier: string;
  if (score >= 80) tier = 'PRIORITY';
  else if (score >= 60) tier = 'HOT';
  else if (score >= 30) tier = 'WARM';
  else tier = 'COLD';

  return { score, tier };
}

@Injectable()
export class QualifyLeadHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Merges qualification data, recalculates score and tier.
   * @returns Result<Lead> — never throws
   */
  async execute(cmd: QualifyLeadCommand): Promise<Result<Lead>> {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id: cmd.leadId, workspaceId: cmd.workspaceId, deletedAt: null },
      });
      if (!lead) {
        return { ok: false, error: new TenantLeakageError(cmd.leadId, cmd.workspaceId) };
      }

      const existing = (lead.qualification ?? {}) as Record<string, unknown>;
      const merged = { ...existing, ...cmd.qualificationData };
      const { score, tier } = calculateScore(merged);

      const updated = await this.prisma.lead.update({
        where: { id: cmd.leadId },
        data: {
          qualification: merged as Record<string, never>,
          score,
          tier: tier as Lead['tier'],
          ...(score >= 60 && lead.status === 'QUALIFYING' && { status: 'QUALIFIED' }),
        },
      });

      return { ok: true, value: updated };
    } catch (error) {
      logger.error({ err: error }, 'QualifyLeadHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
