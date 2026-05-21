import type { PrismaClient } from '@conversionops/db';
import { ConsentStatus } from '@conversionops/db';
import { logger } from '@conversionops/observability';

export interface RetentionReport {
  runAt: string;
  purgedIdempotencyKeys: number;
  anonymisedLeads: number;
  archivedConversations: number;
  purgedMetrics: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Enforces all data retention policies. Safe to run nightly.
 * NEVER deletes AuditLog records or hard-deletes business records.
 */
export async function enforceRetentionPolicies(
  prisma: PrismaClient,
): Promise<RetentionReport> {
  const now = new Date();
  const report: RetentionReport = {
    runAt: now.toISOString(),
    purgedIdempotencyKeys: 0,
    anonymisedLeads: 0,
    archivedConversations: 0,
    purgedMetrics: 0,
  };

  // 1. Purge expired idempotency keys (24-hour TTL)
  try {
    const { count } = await prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    report.purgedIdempotencyKeys = count;
    logger.info({ count }, 'retention: purged expired idempotency keys');
  } catch (err: unknown) {
    logger.error({ err }, 'retention: failed to purge idempotency keys');
  }

  // 2. Anonymise PII for opted-out leads past 30-day window
  try {
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    const optedOutConsents = await prisma.consentRecord.findMany({
      where: {
        status: ConsentStatus.OPTED_OUT,
        optedOutAt: { lt: thirtyDaysAgo },
        deletedAt: null,
      },
      select: { workspaceId: true, leadId: true, phone: true },
    });

    // Group opt-outs by workspace. A phone number that exists in workspace A
    // and workspace B independently must only be anonymised in the workspace
    // where the opt-out was recorded — otherwise opting out in one workspace
    // erases an unrelated lead in another (cross-tenant data mutation).
    const byWorkspace = new Map<string, { leadIds: Set<string>; phones: Set<string> }>();
    for (const c of optedOutConsents) {
      let bucket = byWorkspace.get(c.workspaceId);
      if (!bucket) {
        bucket = { leadIds: new Set(), phones: new Set() };
        byWorkspace.set(c.workspaceId, bucket);
      }
      if (c.leadId) bucket.leadIds.add(c.leadId);
      if (c.phone) bucket.phones.add(c.phone);
    }

    let totalAnonymised = 0;

    for (const [workspaceId, bucket] of byWorkspace) {
      const leadIds = [...bucket.leadIds];
      const phones = [...bucket.phones];
      if (leadIds.length === 0 && phones.length === 0) continue;

      const leadsToAnonymise = await prisma.lead.findMany({
        where: {
          workspaceId,
          piiDeletedAt: null,
          deletedAt: null,
          OR: [
            ...(leadIds.length > 0 ? [{ id: { in: leadIds } }] : []),
            ...(phones.length > 0 ? [{ phone: { in: phones } }] : []),
          ],
        },
        select: { id: true },
      });

      if (leadsToAnonymise.length === 0) continue;

      const ids = leadsToAnonymise.map(l => l.id);

      await prisma.lead.updateMany({
        where: { id: { in: ids }, workspaceId },
        data: { phone: null, email: null, name: null, fullName: null, piiDeletedAt: now },
      });

      const conversations = await prisma.conversation.findMany({
        where: { leadId: { in: ids }, workspaceId },
        select: { id: true },
      });

      if (conversations.length > 0) {
        await prisma.message.updateMany({
          where: { conversationId: { in: conversations.map(c => c.id) }, workspaceId },
          data: { content: '[PII ANONYMISED]' },
        });
      }

      totalAnonymised += leadsToAnonymise.length;
    }

    report.anonymisedLeads = totalAnonymised;
    if (totalAnonymised > 0) {
      logger.info({ count: totalAnonymised, workspaces: byWorkspace.size }, 'retention: anonymised opted-out leads');
    }
  } catch (err: unknown) {
    logger.error({ err }, 'retention: failed to anonymise opted-out leads');
  }

  // 3. Archive old conversations (2+ years) — soft archive only, no deletion
  try {
    const twoYearsAgo = new Date(now.getTime() - TWO_YEARS_MS);

    const { count } = await prisma.conversation.updateMany({
      where: { createdAt: { lt: twoYearsAgo }, archivedAt: null, deletedAt: null },
      data: { archivedAt: now },
    });
    report.archivedConversations = count;
    if (count > 0) logger.info({ count }, 'retention: archived old conversations');
  } catch (err: unknown) {
    logger.error({ err }, 'retention: failed to archive old conversations');
  }

  // 4. Purge old operational metrics (90+ days)
  try {
    const ninetyDaysAgo = new Date(now.getTime() - NINETY_DAYS_MS);
    const { count } = await prisma.operationalMetric.deleteMany({
      where: { recordedAt: { lt: ninetyDaysAgo } },
    });
    report.purgedMetrics = count;
    if (count > 0) logger.info({ count }, 'retention: purged old operational metrics');
  } catch (err: unknown) {
    logger.error({ err }, 'retention: failed to purge operational metrics');
  }

  // NOTE: AuditLog records are NEVER purged. 7-year legal hold.

  logger.info(report, 'retention: policies enforced');
  return report;
}
