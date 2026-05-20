import type { Workspace, Lead } from '@conversionops/db';
import { logger } from '@conversionops/observability';
import { runRuleBasedCheck, scoreHallucination } from '../evals/scorers/hallucination.scorer';
import type { VertexAIClient } from '../client';

export type GuardAction = 'allow' | 'warn' | 'block';

export interface GuardResult {
  allowed: boolean;
  confidence: number;
  flaggedClaims: string[];
  action: GuardAction;
}

interface GenerationContext {
  workspace: Workspace;
  lead: Lead;
  qualification: Record<string, unknown>;
}

/**
 * Pre-send hallucination guard. Runs rule-based check first (fast), then LLM if needed.
 * Returns action='block' if score > 0.6, 'warn' if > 0.3, 'allow' otherwise.
 */
export async function guardAgainstHallucination(
  content: string,
  context: GenerationContext,
  vertexClient?: VertexAIClient,
): Promise<GuardResult> {
  try {
    const { score: fastScore, flaggedClaims: fastClaims } = runRuleBasedCheck(
      content,
      context.qualification,
    );

    if (fastScore <= 0.3 || !vertexClient) {
      const action: GuardAction = fastScore > 0.6 ? 'block' : fastScore > 0.3 ? 'warn' : 'allow';
      return {
        allowed: action !== 'block',
        confidence: 1 - fastScore,
        flaggedClaims: fastClaims,
        action,
      };
    }

    const fullResult = await scoreHallucination(
      content,
      context.workspace,
      context.lead,
      vertexClient,
    );

    const action: GuardAction =
      fullResult.score > 0.6 ? 'block' : fullResult.score > 0.3 ? 'warn' : 'allow';

    if (action !== 'allow') {
      logger.warn(
        { action, claims: fullResult.flaggedClaims, score: fullResult.score },
        'hallucination-guard: content flagged',
      );
    }

    return {
      allowed: action !== 'block',
      confidence: 1 - fullResult.score,
      flaggedClaims: fullResult.flaggedClaims,
      action,
    };
  } catch (err: unknown) {
    logger.error({ err }, 'hallucination-guard: error — defaulting to allow');
    return { allowed: true, confidence: 0.5, flaggedClaims: [], action: 'allow' };
  }
}
