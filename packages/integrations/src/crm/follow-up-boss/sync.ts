import type { Lead, Workspace, PrismaClient } from '@conversionops/db';
import { FollowUpBossClient } from './client';
import type { Result } from '@conversionops/types';

/**
 * Syncs a ConversionOps lead to Follow Up Boss.
 * Maps all available qualification data to the FUB contact format.
 * @returns Result<fubContactId>
 */
export async function syncLeadToFUB(
  lead: Lead,
  _workspace: Workspace,
  apiKey: string,
  _prisma: PrismaClient,
): Promise<Result<string>> {
  const client = new FollowUpBossClient(apiKey);

  const nameParts = (lead.name ?? '').split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || undefined;

  const result = await client.createContact({
    firstName,
    lastName,
    phones: lead.phone ? [{ value: lead.phone, type: 'mobile' }] : [],
    emails: lead.email ? [{ value: lead.email }] : [],
    source: lead.source,
    tags: [lead.tier, lead.status],
  });

  if (!result.ok) return result;
  return { ok: true, value: result.value.id };
}
