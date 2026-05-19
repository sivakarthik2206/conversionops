import type { PrismaClient } from '@conversionops/db';
import { LeadTier, Prisma } from '@conversionops/db';
import type { QualificationData } from '../prompts/qualification.prompt';

export interface LeadScoreBreakdown {
  timeline: number;
  financing: number;
  budget: number;
  urgency: number;
  engagement: number;
  total: number;
}

/**
 * Calculates a lead score from 0–100 based on qualification data.
 * Algorithm: timeline(30) + financing(25) + budget(20) + urgency(15) + engagement(10).
 */
export function calculateScore(
  qualification: QualificationData,
  messageCount = 0,
): number {
  let timeline = 0;
  switch (qualification.timeline) {
    case '30_days':
      timeline = 30;
      break;
    case '90_days':
      timeline = 20;
      break;
    case '6_months':
      timeline = 10;
      break;
    case 'browsing':
      timeline = 0;
      break;
    default:
      timeline = 0;
  }

  let financing = 0;
  switch (qualification.financing) {
    case 'pre_approved':
    case 'cash':
      financing = 25;
      break;
    case 'needs_financing':
      financing = 10;
      break;
    default:
      financing = 0;
  }

  let budget = 0;
  if (qualification.budget) {
    const raw = qualification.budget.replace(/[^0-9]/g, '');
    const amount = parseInt(raw, 10);
    if (!isNaN(amount)) {
      if (amount >= 500000) budget = 20;
      else if (amount >= 300000) budget = 15;
      else if (amount >= 100000) budget = 8;
      else budget = 3;
    } else {
      budget = 5;
    }
  }

  let urgency = 0;
  switch (qualification.urgency) {
    case 'immediate':
      urgency = 15;
      break;
    case 'near_term':
      urgency = 8;
      break;
    case 'browsing':
      urgency = 0;
      break;
    default:
      urgency = 0;
  }

  const engagement = Math.min(10, Math.floor(messageCount / 2));

  return Math.min(100, timeline + financing + budget + urgency + engagement);
}

/**
 * Maps a numeric score to a LeadTier.
 */
export function getTier(score: number): LeadTier {
  if (score >= 80) return LeadTier.PRIORITY;
  if (score >= 60) return LeadTier.HOT;
  if (score >= 30) return LeadTier.WARM;
  return LeadTier.COLD;
}

/**
 * Updates the lead's score, tier, and qualification in the database.
 */
export async function updateLeadScore(
  leadId: string,
  workspaceId: string,
  qualification: QualificationData,
  prisma: PrismaClient,
): Promise<void> {
  const messageCount = await prisma.message.count({
    where: { conversationId: { in: (await prisma.conversation.findMany({ where: { leadId, workspaceId } })).map((c) => c.id) } },
  });

  const score = calculateScore(qualification, messageCount);
  const tier = getTier(score);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score,
      tier,
      qualification: qualification as Prisma.InputJsonValue,
    },
  });
}
