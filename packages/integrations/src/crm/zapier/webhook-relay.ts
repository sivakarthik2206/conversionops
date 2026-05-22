import axios from 'axios';
import type { Lead } from '@conversionops/db';
import type { Result } from '@conversionops/types';
import { ExternalServiceError, withRetry } from '@conversionops/sdk-standards';

interface ConversationMessage { role: string; content: string; createdAt: Date; }

export type CRMEvent =
  | 'lead.created'
  | 'lead.qualified'
  | 'lead.assigned'
  | 'lead.appointment_scheduled'
  | 'lead.converted'
  | 'appointment.booked';

/**
 * Universal Zapier webhook relay. Sends standardised lead payload to any Zap.
 */
export class ZapierWebhookRelay {
  /**
   * POSTs a lead event to the configured Zapier webhook URL.
   * Uses withRetry(3, 1000ms exponential backoff). Returns Result<void>.
   */
  async relayLead(
    webhookUrl: string,
    lead: Lead,
    event: CRMEvent,
    conversations?: Array<{ messages: ConversationMessage[] }>,
  ): Promise<Result<void>> {
    try {
      const conversationSummary = conversations
        ?.flatMap(c => c.messages)
        .slice(-3)
        .map(m => `[${m.role === 'AI' ? 'Agent' : 'Lead'}]: ${m.content}`)
        .join('\n');

      const payload = {
        event,
        timestamp: new Date().toISOString(),
        leadId: lead.id,
        workspaceId: lead.workspaceId,
        lead: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          status: lead.status,
          tier: lead.tier,
          score: lead.score,
          qualification: lead.qualification as Record<string, unknown>,
        },
        conversationSummary: conversationSummary ?? undefined,
      };

      await withRetry(
        () => axios.post(webhookUrl, payload, { timeout: 10_000 }),
        { attempts: 3, backoffMs: 1000 },
      );

      return { ok: true, value: undefined };
    } catch (err: unknown) {
      return {
        ok: false,
        error: new ExternalServiceError(
          'zapier',
          `relay failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      };
    }
  }
}
