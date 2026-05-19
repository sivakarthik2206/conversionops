import type { PrismaClient, Lead, Conversation, Workspace } from '@conversionops/db';
import type { Result } from '@conversionops/types';
import { ExternalServiceError } from '@conversionops/sdk-standards';
import type { FollowUpBossClient, FUBContactInput } from './client';

type LeadSource = Lead['source'];

const SOURCE_MAP: Record<LeadSource, string> = {
  ZILLOW:       'Zillow',
  REALTOR_COM:  'Realtor.com',
  WEB_FORM:     'Website',
  MISSED_CALL:  'Phone Call',
  SMS_INBOUND:  'Text Message',
  MANUAL:       'Manual',
  REACTIVATION: 'Reactivation',
  REFERRAL:     'Referral',
  OTHER:        'Other',
};

interface ConversationWithMessages extends Conversation {
  messages: Array<{ role: string; content: string; createdAt: Date }>;
}

function buildTranscript(conversations: ConversationWithMessages[]): string {
  const lines: string[] = [];
  for (const conv of conversations) {
    for (const msg of conv.messages) {
      const label = msg.role === 'AI' ? 'AGENT' : msg.role === 'HUMAN' ? 'LEAD' : 'SYSTEM';
      const ts = msg.createdAt.toLocaleString('en-US', { timeZone: 'America/New_York' });
      lines.push(`[${ts}] ${label}: ${msg.content}`);
    }
  }
  const full = lines.join('\n');
  return full.length > 5000 ? full.slice(-5000) : full;
}

/**
 * Syncs a lead to Follow Up Boss. Upserts contact, appends conversation transcript as note.
 * All Prisma writes are workspaceId-scoped.
 */
export async function syncLeadToFUB(
  lead: Lead,
  conversations: ConversationWithMessages[],
  workspace: Workspace,
  prisma: PrismaClient,
  client: FollowUpBossClient,
): Promise<Result<void>> {
  try {
    const qual = lead.qualification as Record<string, unknown>;
    const aiConfig = workspace.aiConfig as Record<string, unknown>;

    const nameParts = lead.name?.split(' ') ?? [];
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    let assignedAgentEmail: string | undefined;
    if (lead.assignedWorkspaceUserId) {
      const wu = await prisma.workspaceUser.findFirst({
        where: { id: lead.assignedWorkspaceUserId, workspaceId: lead.workspaceId, deletedAt: null },
        include: { user: { select: { email: true } } },
      });
      assignedAgentEmail = wu?.user.email;
    }

    const contactInput: FUBContactInput = {
      firstName: firstName || undefined,
      lastName,
      phones: lead.phone ? [{ value: lead.phone, type: 'mobile' }] : undefined,
      emails: lead.email ? [{ value: lead.email }] : undefined,
      source: SOURCE_MAP[lead.source] ?? 'Other',
      assignedTo: assignedAgentEmail,
      tags: [lead.tier, `score-${lead.score}`, 'conversionops'].filter(Boolean),
    };

    const sourcePayload = lead.sourcePayload as Record<string, unknown> | null ?? {};
    let fubContactId = typeof sourcePayload['fubContactId'] === 'string' ? sourcePayload['fubContactId'] : null;

    if (!fubContactId && lead.phone) {
      const lookupResult = await client.getContactByPhone(lead.phone);
      if (lookupResult.ok && lookupResult.value) {
        fubContactId = lookupResult.value.id;
      }
    }

    if (fubContactId) {
      const updateResult = await client.updateContact(fubContactId, contactInput);
      if (!updateResult.ok) return updateResult;
    } else {
      const createResult = await client.createContact(contactInput);
      if (!createResult.ok) return createResult;
      fubContactId = createResult.value.id;

      await prisma.lead.update({
        where: { id: lead.id, workspaceId: lead.workspaceId },
        data: { sourcePayload: { fubContactId, lastSyncedAt: new Date().toISOString() } },
      });
    }

    const transcript = buildTranscript(conversations);
    if (transcript) {
      const noteResult = await client.createNote(
        fubContactId,
        transcript,
        'AI Conversation - ConversionOps',
      );
      if (!noteResult.ok) {
        // note creation failed - non-fatal
      }
    }

    const qualSummary = Object.entries(qual)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ');

    if (qualSummary) {
      await client.createEvent(fubContactId, 'note', `Qualification: ${qualSummary}`);
    }

    // crmSyncedAt tracked via sourcePayload above

    // sync complete
    return { ok: true, value: undefined };
  } catch (err: unknown) {
    return {
      ok: false,
      error: new ExternalServiceError(
        'follow-up-boss',
        `syncLeadToFUB failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    };
  }
}


