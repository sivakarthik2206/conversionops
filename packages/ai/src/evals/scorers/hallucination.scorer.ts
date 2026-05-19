import type { VertexAIClient } from '../../client';
import type { Workspace, Lead } from '@conversionops/db';

export interface HallucinationResult {
  score: number;
  flaggedClaims: string[];
  phase: 'rule-based' | 'llm';
  shouldBlock: boolean;
  shouldFlag: boolean;
}

const HALLUCINATION_PATTERNS = [
  { pattern: /\b\d+%\s+of\s+(buyers?|sellers?|homes?|properties|agents?)/i, desc: 'unverifiable statistic' },
  { pattern: /market\s+(will|is going to|should)\s+(drop|rise|increase|decrease)/i, desc: 'market prediction' },
  { pattern: /\b(ranked|rated|voted)\s+#?\d+/i, desc: 'invented ranking claim' },
  { pattern: /on\s+average\s+\$[\d,]+/i, desc: 'invented average price claim' },
  { pattern: /\bguarantee(d)?\b/i, desc: 'guarantee claim' },
  { pattern: /\blicensed\s+in\s+[A-Z]{2}(\s*,\s*[A-Z]{2})*/i, desc: 'unverified license claim' },
  { pattern: /\b(won|earned|received)\s+(award|recognition|certificate)/i, desc: 'unverified award claim' },
  { pattern: /interest\s+rates?\s+(are|will\s+be)\s+\d/i, desc: 'specific interest rate claim' },
];

/** Rule-based fast check — no LLM call. Returns score 0.0-1.0. */
export function runRuleBasedCheck(
  content: string,
  qualification: Record<string, unknown>,
): { score: number; flaggedClaims: string[] } {
  const flagged: string[] = [];

  for (const { pattern, desc } of HALLUCINATION_PATTERNS) {
    if (pattern.test(content)) flagged.push(desc);
  }

  // Check for price claims not matching stated budget
  const budgetInQual = typeof qualification['budget'] === 'string' ? qualification['budget'] : null;
  const priceInContent = content.match(/\$[\d,]+[kKmM]?/);
  if (priceInContent && !budgetInQual) flagged.push('price claim with no established budget');

  const score = Math.min(1, flagged.length * 0.25);
  return { score, flaggedClaims: flagged };
}

/**
 * Scores likelihood of hallucination in an AI-generated real estate message.
 * Phase 1: fast rule-based. Phase 2: LLM verification if score > 0.3.
 */
export async function scoreHallucination(
  aiMessage: string,
  workspace: Workspace,
  lead: Lead,
  vertexClient: VertexAIClient,
): Promise<HallucinationResult> {
  const qualification = (lead.qualification as Record<string, unknown>) ?? {};
  const { score: phase1Score, flaggedClaims: phase1Flags } = runRuleBasedCheck(aiMessage, qualification);

  if (phase1Score <= 0.3) {
    return {
      score: phase1Score,
      flaggedClaims: phase1Flags,
      phase: 'rule-based',
      shouldBlock: false,
      shouldFlag: phase1Score > 0.3,
    };
  }

  const systemPrompt =
    'You are a real estate AI compliance auditor. Analyze messages for factual claims that could be invented. Respond only with valid JSON.';

  const userPrompt = `Analyze this real estate AI message for hallucinated facts.

Message: "${aiMessage}"
Known workspace: ${workspace.name}
Known lead info: budget=${String(qualification['budget'] ?? 'unknown')}, area=${String(qualification['area'] ?? 'unknown')}

List any specific facts (statistics, prices, predictions, credential claims, rankings) that CANNOT be verified from the provided context.

Think step by step, then respond with ONLY this JSON:
{"hallucinationScore": <0.0-1.0>, "flaggedClaims": ["claim1", ...], "chainOfThought": "<brief reasoning>"}`;

  const result = await vertexClient.generate(systemPrompt, userPrompt, {
    maxOutputTokens: 300,
    temperature: 0.1,
  });

  if (!result.ok) {
    return {
      score: phase1Score,
      flaggedClaims: phase1Flags,
      phase: 'rule-based',
      shouldBlock: phase1Score > 0.6,
      shouldFlag: phase1Score > 0.3,
    };
  }

  try {
    const text = result.value.content.trim();
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) throw new Error('no json');
    const parsed = JSON.parse(jsonMatch[0]) as {
      hallucinationScore?: unknown;
      flaggedClaims?: unknown;
    };
    const score = typeof parsed.hallucinationScore === 'number'
      ? Math.max(0, Math.min(1, parsed.hallucinationScore))
      : phase1Score;
    const claims = Array.isArray(parsed.flaggedClaims)
      ? (parsed.flaggedClaims as unknown[]).filter((c): c is string => typeof c === 'string')
      : phase1Flags;

    return {
      score,
      flaggedClaims: claims,
      phase: 'llm',
      shouldBlock: score > 0.6,
      shouldFlag: score > 0.3,
    };
  } catch {
    return {
      score: phase1Score,
      flaggedClaims: phase1Flags,
      phase: 'rule-based',
      shouldBlock: phase1Score > 0.6,
      shouldFlag: phase1Score > 0.3,
    };
  }
}

