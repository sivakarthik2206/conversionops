import { createHash } from 'crypto';
import type { VertexAIClient } from '../../client';

const scoreCache = new Map<string, number>();

/**
 * Scores how relevant an AI response is to the lead's last message.
 * Uses Gemini with structured JSON output. Caches results to avoid re-scoring.
 * @returns 0.0-1.0 relevance score
 */
export async function scoreRelevance(
  aiMessage: string,
  leadMessage: string,
  conversationContext: string,
  vertexClient: VertexAIClient,
): Promise<number> {
  const cacheKey = createHash('sha256')
    .update(`${aiMessage}::${leadMessage}`)
    .digest('hex');

  const cached = scoreCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const systemPrompt =
    'You are an AI evaluation assistant for a real estate lead conversion system. Respond only with valid JSON.';

  const userPrompt = `Rate how directly this AI response addresses the lead message.

Lead message: "${leadMessage}"
AI response: "${aiMessage}"
Context: "${conversationContext.slice(0, 500)}"

Consider:
- Does the AI answer the question or statement from the lead?
- Does it progress the qualification naturally?
- Is it contextually appropriate for a real estate conversation?

Respond with ONLY this JSON (no other text): {"score": <0.0-1.0>, "reasoning": "<one sentence>"}`;

  const result = await vertexClient.generate(systemPrompt, userPrompt, {
    maxOutputTokens: 100,
    temperature: 0.1,
  });

  if (!result.ok) return 0.5;

  try {
    const text = result.value.content.trim();
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return 0.5;
    const parsed = JSON.parse(jsonMatch[0]) as { score?: unknown };
    const score = typeof parsed.score === 'number'
      ? Math.max(0, Math.min(1, parsed.score))
      : 0.5;
    scoreCache.set(cacheKey, score);
    return score;
  } catch {
    return 0.5;
  }
}

