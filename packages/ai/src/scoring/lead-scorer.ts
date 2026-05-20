import type { PrismaClient, Prisma } from '@conversionops/db';
import { LeadTier } from '@conversionops/db';
import type { QualificationData } from '../prompts/qualification.prompt';

export interface LeadScoreBreakdown {
  timeline: number;
  financing: number;
  budget: number;
  urgency: number;
  engagement: number;
}

const TIMELINE_SCORES: Record<string, number> = {
  '30_days': 30,
  '90_days': 20,
  '6_months': 10,
  browsing: 0,
};

const FINANCING_SCORES: Record<string, number> = {
  pre_approved: 25,
  cash: 25,
  needs_financing: 10,
  unknown: 0,
};

const URGENCY_SCORES: Record<string, number> = {
  immediate: 15,
  near_term: 8,
  browsing: 0,
};

/**
 * Calculates a 0-100 lead score from qualification data.
 * @returns Integer score 0-100
 */
export function calculateScore(
  qualification: QualificationData,
  engagementScore = 0,
): number {
  const timelineScore = TIMELINE_SCORES[qualification.timeline ?? ''] ?? 0;
  const financingScore = FINANCING_SCORES[qualification.financing ?? ''] ?? 0;

  let budgetScore = 0;
  if (qualification.budget) {
    const amount = parseBudgetAmount(qualification.budget);
    if (amount > 500000) budgetScore = 20;
    else if (amount > 300000) budgetScore = 15;
    else if (amount > 100000) budgetScore = 8;
    else budgetScore = 3;
  }

  const urgencyScore = URGENCY_SCORES[qualification.urgency ?? ''] ?? 0;
  const engagementCapped = Math.min(engagementScore, 10);

  return Math.min(
    timelineScore + financingScore + budgetScore + urgencyScore + engagementCapped,
    100,
  );
}

/**
 * Returns the full score breakdown including tier and component scores.
 */
export function calculateScoreDetailed(
  qualification: QualificationData,
  engagementScore = 0,
): { total: number; tier: LeadTier; breakdown: LeadScoreBreakdown } {
  const timelineScore = TIMELINE_SCORES[qualification.timeline ?? ''] ?? 0;
  const financingScore = FINANCING_SCORES[qualification.financing ?? ''] ?? 0;

  let budgetScore = 0;
  if (qualification.budget) {
    const amount = parseBudgetAmount(qualification.budget);
    if (amount > 500000) budgetScore = 20;
    else if (amount > 300000) budgetScore = 15;
    else if (amount > 100000) budgetScore = 8;
    else budgetScore = 3;
  }

  const urgencyScore = URGENCY_SCORES[qualification.urgency ?? ''] ?? 0;
  const engagementCapped = Math.min(engagementScore, 10);
  const total = Math.min(timelineScore + financingScore + budgetScore + urgencyScore + engagementCapped, 100);

  return {
    total,
    tier: getTier(total),
    breakdown: { timeline: timelineScore, financing: financingScore, budget: budgetScore, urgency: urgencyScore, engagement: engagementCapped },
  };
}

/**
 * Returns the lead tier label for a numeric score.
 */
export function getTier(score: number): LeadTier {
  if (score >= 80) return LeadTier.PRIORITY;
  if (score >= 60) return LeadTier.HOT;
  if (score >= 30) return LeadTier.WARM;
  return LeadTier.COLD;
}

/**
 * Persists updated lead score and tier to the database.
 * Scoped to workspaceId — safe from cross-tenant writes.
 */
export async function updateLeadScore(
  leadId: string,
  workspaceId: string,
  qualification: QualificationData,
  engagementScore: number,
  prisma: PrismaClient,
): Promise<void> {
  const total = calculateScore(qualification, engagementScore);
  const tier = getTier(total);

  await prisma.lead.updateMany({
    where: { id: leadId, workspaceId },
    data: {
      score: total,
      tier,
      qualification: qualification as unknown as Prisma.InputJsonValue,
    },
  });
}

function parseBudgetAmount(budget: string): number {
  const cleaned = budget.replace(/[$,\s]/g, '').toLowerCase();
  const kMatch = cleaned.match(/^([\d.]+)k$/);
  if (kMatch) return parseFloat(kMatch[1] ?? '0') * 1000;
  const mMatch = cleaned.match(/^([\d.]+)m(?:illion)?$/);
  if (mMatch) return parseFloat(mMatch[1] ?? '0') * 1_000_000;
  const plain = parseFloat(cleaned);
  return isNaN(plain) ? 0 : plain;
}
