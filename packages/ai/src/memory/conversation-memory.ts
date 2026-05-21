import type { PrismaClient } from '@conversionops/db';
import type { VertexAIClient } from '../client';
import type { ConversationContext, ConversationMessage } from '../prompts/qualification.prompt';

const SUMMARY_TRIGGER_COUNT = 20;
const MAX_CONTEXT_MESSAGES = 12;

export class ConversationMemoryManager {
  constructor(private readonly vertexClient: VertexAIClient) {}

  /**
   * Builds the conversation context for AI prompt construction.
   * - ≤12 messages: returns full history
   * - >12 messages with existing summary: returns summary + last 12
   * - >20 messages without summary: generates summary, persists it, returns summary + last 12
   */
  async buildContext(
    conversationId: string,
    workspaceId: string,
    prisma: PrismaClient,
  ): Promise<ConversationContext> {
    // Tenant scope on every read so AI cannot see another workspace's memory.
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId, deletedAt: null },
      select: { contextSummary: true },
    });

    if (!conversation) {
      // Either the conversation doesn't exist or it belongs to a different
      // workspace. Either way, return empty context — never fall back to
      // unscoped reads.
      return { messages: [], summary: null };
    }

    const allMessages = await prisma.message.findMany({
      where: { conversationId, workspaceId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    const mapped: ConversationMessage[] = allMessages.map((m) => ({
      role: m.role as 'AI' | 'HUMAN' | 'SYSTEM',
      content: m.content,
      createdAt: m.createdAt,
    }));

    if (mapped.length <= MAX_CONTEXT_MESSAGES) {
      return { messages: mapped, summary: null };
    }

    const last12 = mapped.slice(-MAX_CONTEXT_MESSAGES);

    if (conversation.contextSummary) {
      return { messages: last12, summary: conversation.contextSummary };
    }

    if (mapped.length >= SUMMARY_TRIGGER_COUNT) {
      const olderMessages = mapped.slice(0, -MAX_CONTEXT_MESSAGES);
      const summaryResult = await this.generateSummary(olderMessages);

      if (summaryResult) {
        // updateMany with workspaceId predicate — never widens scope even if
        // a future refactor passes a foreign conversationId.
        await prisma.conversation.updateMany({
          where: { id: conversationId, workspaceId },
          data: {
            contextSummary: summaryResult,
            summarisedUpTo: allMessages[allMessages.length - MAX_CONTEXT_MESSAGES - 1]?.id ?? null,
          },
        });
        return { messages: last12, summary: summaryResult };
      }
    }

    return { messages: last12, summary: null };
  }

  /**
   * Generates a concise 3-5 sentence summary of older conversation messages.
   * Used when message count exceeds 20 to compress context.
   */
  async generateSummary(messages: ConversationMessage[]): Promise<string | null> {
    if (messages.length === 0) return null;

    const historyText = messages
      .map((m) => `${m.role === 'AI' ? 'Agent' : 'Lead'}: ${m.content}`)
      .join('\n');

    const systemPrompt =
      'You are a conversation summariser for a real estate AI system. Be factual and concise.';
    const userPrompt = `Summarise this real estate lead conversation in 3-5 sentences. Include: buyer/seller intent, budget mentioned, timeline, area of interest, financing status, concerns raised, and current qualification stage.

Conversation:
${historyText}

Summary (3-5 sentences, factual, no opinions):`;

    const result = await this.vertexClient.generate(systemPrompt, userPrompt, {
      maxOutputTokens: 250,
      temperature: 0.2,
    });

    if (!result.ok) return null;
    return result.value.content.trim();
  }
}
