/**
 * Unit tests for token-budget governance functions.
 * Verifies quota checks, usage tracking, and alert thresholds.
 */

import { checkQuota, trackUsage, alertIfApproaching } from '../governance/token-budget';

function buildMockPrisma(overrides: {
  workspace?: {
    tokenUsageCurrentMonth: number;
    tokenQuotaMonthly: number;
    tokenQuotaAlertSentAt?: Date | null;
  } | null;
} = {}) {
  const workspace = overrides.workspace !== undefined ? overrides.workspace : {
    tokenUsageCurrentMonth: 5000,
    tokenQuotaMonthly: 100000,
    tokenQuotaAlertSentAt: null,
  };

  return {
    workspace: {
      findFirst: jest.fn().mockResolvedValue(workspace),
      update: jest.fn().mockResolvedValue({}),
    },
    aIUsageRecord: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation(async (ops: unknown[]) => {
      return Promise.all(ops);
    }),
  };
}

describe('checkQuota()', () => {
  it('returns allowed=true when under quota', async () => {
    const prisma = buildMockPrisma({
      workspace: { tokenUsageCurrentMonth: 5000, tokenQuotaMonthly: 100000 },
    });

    const result = await checkQuota('ws-1', prisma as never);

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(5000);
    expect(result.limit).toBe(100000);
    expect(result.percentUsed).toBeCloseTo(0.05);
  });

  it('returns allowed=false when at or over quota', async () => {
    const prisma = buildMockPrisma({
      workspace: { tokenUsageCurrentMonth: 100000, tokenQuotaMonthly: 100000 },
    });

    const result = await checkQuota('ws-1', prisma as never);

    expect(result.allowed).toBe(false);
    expect(result.percentUsed).toBe(1);
  });

  it('returns allowed=false when workspace not found', async () => {
    const prisma = buildMockPrisma({ workspace: null });

    const result = await checkQuota('ws-missing', prisma as never);

    expect(result.allowed).toBe(false);
    expect(result.percentUsed).toBe(1);
  });

  it('handles zero quota limit without divide-by-zero', async () => {
    const prisma = buildMockPrisma({
      workspace: { tokenUsageCurrentMonth: 0, tokenQuotaMonthly: 0 },
    });

    const result = await checkQuota('ws-1', prisma as never);

    expect(result.percentUsed).toBe(1);
    expect(result.allowed).toBe(false);
  });
});

describe('trackUsage()', () => {
  it('creates AIUsageRecord and increments workspace counter atomically', async () => {
    const prisma = buildMockPrisma();

    await trackUsage('ws-1', 'lead-1', 'msg-1', { input: 150, output: 80 }, 'qualification', 3, prisma as never);

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('stores correct total token count', async () => {
    const createFn = jest.fn().mockResolvedValue({});
    const updateFn = jest.fn().mockResolvedValue({});
    const prisma = {
      workspace: { update: updateFn },
      aIUsageRecord: { create: createFn },
      $transaction: jest.fn().mockImplementation(async (ops: unknown[]) => Promise.all(ops)),
    };

    await trackUsage('ws-1', null, null, { input: 200, output: 100 }, 'response', 5, prisma as never);

    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ inputTokens: 200, outputTokens: 100, totalTokens: 300 }),
      }),
    );
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenUsageCurrentMonth: { increment: 300 } }),
      }),
    );
  });
});

describe('alertIfApproaching()', () => {
  it('returns shouldAlert=false when below 80% threshold', async () => {
    const prisma = buildMockPrisma();

    const result = await alertIfApproaching('ws-1', 0.5, prisma as never);

    expect(result.shouldAlert).toBe(false);
    expect(prisma.workspace.findFirst).not.toHaveBeenCalled();
  });

  it('returns shouldAlert=true when above 80% and not yet alerted today', async () => {
    const prisma = buildMockPrisma({
      workspace: {
        tokenUsageCurrentMonth: 85000,
        tokenQuotaMonthly: 100000,
        tokenQuotaAlertSentAt: null,
      },
    });

    const result = await alertIfApproaching('ws-1', 0.85, prisma as never);

    expect(result.shouldAlert).toBe(true);
    expect(prisma.workspace.update).toHaveBeenCalled();
  });

  it('returns shouldAlert=false when alert already sent within 24 hours', async () => {
    const prisma = buildMockPrisma({
      workspace: {
        tokenUsageCurrentMonth: 90000,
        tokenQuotaMonthly: 100000,
        tokenQuotaAlertSentAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      },
    });

    const result = await alertIfApproaching('ws-1', 0.9, prisma as never);

    expect(result.shouldAlert).toBe(false);
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it('returns isExhausted=true when percentUsed >= 1', async () => {
    const prisma = buildMockPrisma({
      workspace: {
        tokenUsageCurrentMonth: 100000,
        tokenQuotaMonthly: 100000,
        tokenQuotaAlertSentAt: null,
      },
    });

    const result = await alertIfApproaching('ws-1', 1.0, prisma as never);

    expect(result.isExhausted).toBe(true);
  });

  it('returns shouldAlert=false when workspace not found', async () => {
    const prisma = buildMockPrisma({ workspace: null });

    const result = await alertIfApproaching('ws-missing', 0.9, prisma as never);

    expect(result.shouldAlert).toBe(false);
  });
});
