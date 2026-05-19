import type { PrismaClient, Lead, Workspace } from '@conversionops/db';
import type { Result } from '@conversionops/types';
import type { VertexAIClient } from '../client';
import type { QualificationData, ConversationMessage } from '../prompts/qualification.prompt';
import { buildQualificationPrompt } from '../prompts/qualification.prompt';
import { buildResponsePrompt } from '../prompts/response.prompt';
import { buildSystemPrompt } from '../prompts/system.prompt';
import { ConversationMemoryManager } from '../memory/conversation-memory';

export interface QualificationResult {
  content: string;
  extractedData: QualificationData;
  updatedQualification: QualificationData;
  shouldBook: boolean;
  leadScoreDelta: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

const BUDGET_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\$?\s*(\d[\d,]*)\s*k\b/i, value: '' },
  { pattern: /budget.{0,20}(\$[\d,]+)/i, value: '' },
  { pattern: /\$\s*([\d,]+)/i, value: '' },
];

const TIMELINE_MAP: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\b(asap|immediately|right away|now|urgent)/i, value: '30_days' },
  { pattern: /\b(30|thirty)\s*days?\b/i, value: '30_days' },
  { pattern: /\b(60|sixty|90|ninety|3\s*months?)\b/i, value: '90_days' },
  { pattern: /\b(6\s*months?|half a year)\b/i, value: '6_months' },
  { pattern: /\b(just\s+looking|browsing|exploring|not\s+sure|no\s+rush)\b/i, value: 'browsing' },
];

const FINANCING_MAP: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\b(pre.?approved|pre.?approval|already.{0,10}(approved|qualified))\b/i, value: 'pre_approved' },
  { pattern: /\b(cash\s*buyer|paying\s*cash|all\s*cash)\b/i, value: 'cash' },
  { pattern: /\b(need|looking\s*for|getting)\s*(a\s*)?(mortgage|loan|financing)\b/i, value: 'needs_financing' },
];

const INTENT_MAP: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\b(sell|selling|list|listing)\b/i, value: 'sell' },
  { pattern: /\b(buy|buying|purchase|looking\s*to\s*buy)\b/i, value: 'buy' },
  { pattern: /\b(both|buy\s*and\s*sell)\b/i, value: 'both' },
];

const BOOKING_SIGNALS = [
  /\b(schedule|book|appointment|meeting|call|available|when\s*can)\b/i,
  /\b(talk\s*to\s*(someone|a\s*person|agent|human))\b/i,
  /\b(yes|sure|sounds\s*good|let'?s\s*do\s*it|i'?m\s*interested)\b/i,
];

/**
 * Runs the qualification chain for a conversation.
 * Selects the right prompt, calls Vertex AI, extracts structured data, and returns results.
 */
export async function runQualificationChain(
  conversationId: string,
  workspace: Workspace,
  lead: Lead,
  vertexClient: VertexAIClient,
  prisma: PrismaClient,
): Promise<Result<QualificationResult>> {
  const memoryManager = new ConversationMemoryManager(vertexClient);
  const context = await memoryManager.buildContext(conversationId, prisma);

  const currentQualification = (lead.qualification as QualificationData | null) ?? {};
  const systemPrompt = buildSystemPrompt(workspace);

  const isFirstContact = context.messages.filter((m) => m.role === 'AI').length === 0;

  const userPrompt = isFirstContact
    ? buildResponsePrompt(lead, workspace)
    : buildQualificationPrompt({ ...context, leadName: lead.name }, currentQualification);

  const genResult = await vertexClient.generateWithRetry(systemPrompt, userPrompt);
  if (!genResult.ok) return genResult;

  const { content, inputTokens, outputTokens, latencyMs } = genResult.value;

  const extractedData = extractQualificationData(content, context.messages.map((m: ConversationMessage) => m.content).join(' '));
  const updatedQualification: QualificationData = { ...currentQualification };

  for (const [key, value] of Object.entries(extractedData)) {
    if (value && !updatedQualification[key as keyof QualificationData]) {
      (updatedQualification as Record<string, string>)[key] = value;
    }
  }

  const answeredFields = Object.values(updatedQualification).filter(Boolean).length;
  const leadScoreDelta = answeredFields * 2;

  const shouldBook =
    answeredFields >= 5 ||
    BOOKING_SIGNALS.some((p) => p.test(content)) ||
    BOOKING_SIGNALS.some((p) =>
      p.test(context.messages.slice(-3).map((m: ConversationMessage) => m.content).join(' ')),
    );

  return {
    ok: true,
    value: {
      content,
      extractedData,
      updatedQualification,
      shouldBook,
      leadScoreDelta,
      inputTokens,
      outputTokens,
      latencyMs,
    },
  };
}

function extractQualificationData(aiResponse: string, conversationText: string): QualificationData {
  const fullText = `${conversationText} ${aiResponse}`;
  const extracted: QualificationData = {};

  for (const { pattern } of BUDGET_PATTERNS) {
    if (pattern.test(fullText)) {
      extracted.budget = fullText.match(pattern)?.[0] ?? undefined;
      break;
    }
  }

  for (const { pattern, value } of TIMELINE_MAP) {
    if (pattern.test(fullText)) {
      extracted.timeline = value;
      break;
    }
  }

  for (const { pattern, value } of FINANCING_MAP) {
    if (pattern.test(fullText)) {
      extracted.financing = value;
      break;
    }
  }

  for (const { pattern, value } of INTENT_MAP) {
    if (pattern.test(fullText)) {
      extracted.intent = value;
      break;
    }
  }

  const areaMatch = fullText.match(
    /\b(?:in|around|near|looking\s+at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)\b/,
  );
  if (areaMatch?.[1]) extracted.area = areaMatch[1];

  const propertyMatch = fullText.match(
    /\b(single.?family|condo|townhouse|town\s*home|duplex|multi.?family|apartment|land|lot)\b/i,
  );
  if (propertyMatch?.[1]) extracted.propertyType = propertyMatch[1].toLowerCase();

  const urgencyMatch = fullText.match(/\b(immediate|asap|urgent|flexible|no rush|browsing)\b/i);
  if (urgencyMatch?.[1]) {
    const urg = urgencyMatch[1].toLowerCase();
    if (['immediate', 'asap', 'urgent'].includes(urg)) extracted.urgency = 'immediate';
    else if (urg === 'flexible') extracted.urgency = 'near_term';
    else extracted.urgency = 'browsing';
  }

  return extracted;
}
