import type { PrismaClient } from '@conversionops/db';

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  percentUsed: number;
}

export interface AlertResult {
  shouldAlert: boolean;
  isExhausted: boolean;
  percentUsed: number;
}

const QUOTA_ALERT_THRESHOLD = 0.8;
const BILLING_MONTH_BASE = 10000;

function currentBillingMonth(): number {
  const now = new Date();
  return now.getFullYear() * BILLING_MONTH_BASE + (now.getMonth() + 1);
}

/**
 * Checks whether a workspace is within its monthly AI token quota.
 * @returns QuotaCheckResult with allowed=false if quota is exhausted
 */
export async function checkQuota(
  workspaceId: string,
  prisma: PrismaClient,
): Promise<QuotaCheckResult> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    select: { tokenUsageCurrentMonth: true, tokenQuotaMonthly: true },
  });

  if (!workspace) {
    return { allowed: false, used: 0, limit: 0, percentUsed: 1 };
  }

  const used = workspace.tokenUsageCurrentMonth;
  const limit = workspace.tokenQuotaMonthly;
  const percentUsed = limit > 0 ? used / limit : 1;

  return {
    allowed: used < limit,
    used,
    limit,
    percentUsed,
  };
}

/**
 * Records AI token usage for a workspace.
 * Updates the workspace's current month counter atomically.
 */
export async function trackUsage(
  workspaceId: string,
  leadId: string | null,
  messageId: string | null,
  tokens: { input: number; output: number },
  operation: string,
  costCents: number,
  prisma: PrismaClient,
): Promise<void> {
  const totalTokens = tokens.input + tokens.output;
  const billingMonth = currentBillingMonth();

  await prisma.$transaction([
    prisma.aIUsageRecord.create({
      data: {
        workspaceId,
        leadId,
        messageId,
        model: process.env['VERTEX_AI_MODEL'] ?? 'gemini-1.5-flash-001',
        provider: 'vertex-ai',
        inputTokens: tokens.input,
        outputTokens: tokens.output,
        totalTokens,
        costCents,
        operation,
        billingMonth,
        billingDay: new Date().getDate(),
      },
    }),
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { tokenUsageCurrentMonth: { increment: totalTokens } },
    }),
  ]);
}

/**
 * Determines if a quota alert should be sent and marks the alert timestamp.
 * Returns whether the caller should enqueue a notification.
 * The actual queue enqueue is handled by the calling processor (dependency boundary).
 */
export async function alertIfApproaching(
  workspaceId: string,
  percentUsed: number,
  prisma: PrismaClient,
): Promise<AlertResult> {
  if (percentUsed < QUOTA_ALERT_THRESHOLD) {
    return { shouldAlert: false, isExhausted: false, percentUsed };
  }

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    select: { tokenQuotaAlertSentAt: true },
  });
  if (!workspace) return { shouldAlert: false, isExhausted: false, percentUsed };

  const alreadyAlerted =
    workspace.tokenQuotaAlertSentAt &&
    workspace.tokenQuotaAlertSentAt > new Date(Date.now() - 24 * 60 * 60 * 1000);

  const shouldAlert = !alreadyAlerted;
  const isExhausted = percentUsed >= 1;

  if (shouldAlert) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { tokenQuotaAlertSentAt: new Date() },
    });
  }

  return { shouldAlert, isExhausted, percentUsed };
}
