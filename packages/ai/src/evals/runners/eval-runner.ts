import type { PrismaClient, NotificationType } from '@conversionops/db';
import { EscalationLevel } from '@conversionops/db';
import { logger } from '@conversionops/observability';
import type { VertexAIClient } from '../../client';
import { scoreRelevance } from '../scorers/relevance.scorer';
import { scoreHallucination } from '../scorers/hallucination.scorer';
import { scoreBookingIntent } from '../scorers/booking-intent.scorer';
import { scoreQualificationProgress } from '../scorers/qualification.scorer';

export interface EvalJobData {
  messageId: string;
  workspaceId: string;
  leadId: string;
  conversationId: string;
}

export interface EvalSideEffect {
  type: 'notification';
  notificationType: NotificationType;
  payload: Record<string, unknown>;
  isOpsAlert: boolean;
  priority?: number;
}

export interface EvalRunResult {
  overallScore: number;
  relevanceScore: number;
  hallucinationScore: number;
  bookingIntentScore: number;
  qualProgressScore: number;
  sideEffects: EvalSideEffect[];
}

/**
 * Runs all 4 AI eval scorers in parallel after an AI message is generated.
 * Fire-and-forget — never throws. Eval failure must not affect main flow.
 * Side effects (notifications/escalations) are returned for the caller to enqueue.
 */
export async function runEvals(
  { messageId, workspaceId, leadId, conversationId }: EvalJobData,
  prisma: PrismaClient,
  vertexClient: VertexAIClient,
): Promise<void> {
  try {
    const [message, lead, workspace, messages] = await Promise.all([
      prisma.message.findFirst({ where: { id: messageId, workspaceId } }),
      prisma.lead.findFirst({ where: { id: leadId, workspaceId } }),
      prisma.workspace.findFirst({ where: { id: workspaceId } }),
      prisma.message.findMany({
        where: { conversationId, workspaceId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      }),
    ]);

    if (!message || !lead || !workspace) {
      logger.warn({ messageId, workspaceId }, 'runEvals: missing records, skipping');
      return;
    }

    const humanMessages = messages.filter(m => m.role === 'HUMAN');
    const lastHumanMessage = humanMessages[humanMessages.length - 1]?.content ?? '';
    const conversationContext = messages
      .slice(-6)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const qualification = (lead.qualification as Record<string, unknown>) ?? {};

    const [relevanceScore, hallucinationResult, bookingIntentScore, qualProgressScore] =
      await Promise.all([
        scoreRelevance(message.content, lastHumanMessage, conversationContext, vertexClient)
          .catch(() => 0.5),
        scoreHallucination(message.content, workspace, lead, vertexClient)
          .catch(() => ({
            score: 0,
            flaggedClaims: [] as string[],
            phase: 'rule-based' as const,
            shouldBlock: false,
            shouldFlag: false,
          })),
        Promise.resolve(
          scoreBookingIntent(
            messages.map(m => ({
              role: m.role as 'AI' | 'HUMAN' | 'SYSTEM',
              content: m.content,
            })),
          ),
        ),
        Promise.resolve(
          scoreQualificationProgress(
            qualification as Parameters<typeof scoreQualificationProgress>[0],
          ),
        ),
      ]);

    const overallScore =
      relevanceScore * 0.30 +
      (1 - hallucinationResult.score) * 0.40 +
      bookingIntentScore * 0.15 +
      qualProgressScore * 0.15;

    const flaggedIssues: Array<{ type: string; detail: string }> = [];
    if (hallucinationResult.flaggedClaims.length > 0) {
      flaggedIssues.push({
        type: 'hallucination',
        detail: hallucinationResult.flaggedClaims.join('; '),
      });
    }
    if (relevanceScore < 0.6) {
      flaggedIssues.push({ type: 'low_relevance', detail: `score ${relevanceScore.toFixed(2)}` });
    }

    await prisma.aIEvalResult.create({
      data: {
        workspaceId,
        messageId,
        status: 'SCORED',
        relevanceScore,
        hallucinationScore: hallucinationResult.score,
        bookingIntentScore,
        qualProgressScore,
        overallScore,
        flaggedIssues: flaggedIssues.length > 0 ? JSON.parse(JSON.stringify(flaggedIssues)) : undefined,
        isRegression: false,
      },
    });

    if (hallucinationResult.shouldBlock) {
      logger.warn(
        { messageId, workspaceId, claims: hallucinationResult.flaggedClaims },
        'runEvals: hallucination block — escalating conversation',
      );
      await prisma.conversation.updateMany({
        where: { id: conversationId, workspaceId },
        data: {
          escalationLevel: EscalationLevel.URGENT,
          escalationReason: `AI hallucination: ${hallucinationResult.flaggedClaims.slice(0, 2).join(', ')}`,
          escalatedAt: new Date(),
          aiActive: false,
          status: 'HUMAN_ACTIVE',
        },
      });
    }

    logger.info(
      { messageId, overallScore: overallScore.toFixed(2), hallucinationBlock: hallucinationResult.shouldBlock },
      'runEvals: completed',
    );
  } catch (err: unknown) {
    logger.error({ err, messageId }, 'runEvals: unexpected error — swallowing to protect main flow');
  }
}



