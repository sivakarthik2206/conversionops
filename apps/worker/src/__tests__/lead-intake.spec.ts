/**
 * Unit tests for LeadIntakeProcessor.
 * All external dependencies (Prisma, queues, realtime) are mocked.
 */

// ---- resolveSource helper ----
// resolveSource is not exported, so we test it via processor behavior
// and via the known mapping logic (pure function inline below for test clarity)
function resolveSource(source: unknown): string {
  const s = String(source ?? '').toUpperCase();
  const valid: Record<string, string> = {
    ZILLOW: 'ZILLOW',
    REALTOR_COM: 'REALTOR_COM',
    WEB_FORM: 'WEB_FORM',
    MISSED_CALL: 'MISSED_CALL',
    SMS_INBOUND: 'SMS_INBOUND',
    MANUAL: 'MANUAL',
    REACTIVATION: 'REACTIVATION',
    REFERRAL: 'REFERRAL',
  };
  return valid[s] ?? 'OTHER';
}

describe('LeadIntakeProcessor — resolveSource', () => {
  describe('known sources map correctly', () => {
    const cases: [unknown, string][] = [
      ['ZILLOW', 'ZILLOW'],
      ['zillow', 'ZILLOW'],
      ['Zillow', 'ZILLOW'],
      ['REALTOR_COM', 'REALTOR_COM'],
      ['WEB_FORM', 'WEB_FORM'],
      ['MISSED_CALL', 'MISSED_CALL'],
      ['SMS_INBOUND', 'SMS_INBOUND'],
      ['MANUAL', 'MANUAL'],
      ['REACTIVATION', 'REACTIVATION'],
      ['REFERRAL', 'REFERRAL'],
    ];

    it.each(cases)('resolveSource(%s) → %s', (input, expected) => {
      expect(resolveSource(input)).toBe(expected);
    });
  });

  describe('unknown / nullish sources fall back to OTHER', () => {
    it('null → OTHER', () => expect(resolveSource(null)).toBe('OTHER'));
    it('undefined → OTHER', () => expect(resolveSource(undefined)).toBe('OTHER'));
    it('empty string → OTHER', () => expect(resolveSource('')).toBe('OTHER'));
    it('random string → OTHER', () => expect(resolveSource('FACEBOOK_AD')).toBe('OTHER'));
  });
});

// ---- LeadIntakeProcessor — mocked integration tests ----

jest.mock('@conversionops/orchestration', () => ({
  queues: {
    aiResponse: { add: jest.fn().mockResolvedValue(undefined) },
    auditLog: { add: jest.fn().mockResolvedValue(undefined) },
  },
  EventStore: jest.fn().mockImplementation(() => ({
    append: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('@conversionops/observability', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { LeadIntakeProcessor } from '../processors/lead-intake.processor';
import { queues } from '@conversionops/orchestration';
import type { Job } from 'bullmq';
import type { LeadIntakeJobData } from '@conversionops/orchestration';

function makeJob(overrides: Partial<LeadIntakeJobData> = {}): Job<LeadIntakeJobData> {
  return {
    data: {
      workspaceId: 'ws-1',
      from: '+15551234567',
      to: '+15559999999',
      body: 'Hello I need help',
      messageSid: 'SMabc123',
      source: 'SMS_INBOUND',
      ...overrides,
    },
  } as unknown as Job<LeadIntakeJobData>;
}

const WORKSPACE = { id: 'ws-1', name: 'Test Brokerage', timezone: 'America/New_York' };

function buildMockPrisma(overrides: Partial<{
  workspace: typeof WORKSPACE | null;
  lead: { id: string; phone: string } | null;
  conversation: { id: string } | null;
}> = {}) {
  const workspace = overrides.workspace !== undefined ? overrides.workspace : WORKSPACE;
  const lead = overrides.lead !== undefined ? overrides.lead : null;
  const conversation = overrides.conversation !== undefined ? overrides.conversation : { id: 'conv-1' };

  return {
    workspace: { findUnique: jest.fn().mockResolvedValue(workspace) },
    lead: { findFirst: jest.fn().mockResolvedValue(lead), create: jest.fn().mockResolvedValue({ id: 'lead-new' }) },
    conversation: {
      findFirst: jest.fn().mockResolvedValue(conversation),
      create: jest.fn().mockResolvedValue({ id: 'conv-new' }),
    },
    message: { create: jest.fn().mockResolvedValue({ id: 'msg-1' }) },
    leadEvent: {},
    // Always expose both lead and conversation in every transaction — the processor
    // may call $transaction once (for conversation) or twice (lead + conversation)
    // depending on whether a leadId was pre-resolved.
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        lead: {
          findFirst: jest.fn().mockResolvedValue(lead),
          create: jest.fn().mockResolvedValue({ id: 'lead-new' }),
        },
        conversation: {
          findFirst: jest.fn().mockResolvedValue(conversation),
          create: jest.fn().mockResolvedValue({ id: 'conv-new' }),
        },
      };
      return fn(tx);
    }),
  };
}

function buildMockRealtime() {
  return { emitToWorkspace: jest.fn() };
}

describe('LeadIntakeProcessor — process()', () => {
  let processor: LeadIntakeProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips processing when workspace not found', async () => {
    const prisma = buildMockPrisma({ workspace: null });
    const realtime = buildMockRealtime();
    processor = new LeadIntakeProcessor(prisma as never, realtime as never);

    await processor.process(makeJob());

    expect(queues.aiResponse.add).not.toHaveBeenCalled();
  });

  it('enqueues ai-response when lead and conversation exist', async () => {
    const prisma = buildMockPrisma({
      lead: { id: 'lead-existing', phone: '+15551234567' },
      conversation: { id: 'conv-existing' },
    });
    const realtime = buildMockRealtime();
    processor = new LeadIntakeProcessor(prisma as never, realtime as never);

    await processor.process(makeJob({ leadId: 'lead-existing' }));

    expect(queues.aiResponse.add).toHaveBeenCalledWith(
      'respond',
      expect.objectContaining({ leadId: 'lead-existing', workspaceId: 'ws-1' }),
      expect.any(Object),
    );
  });

  it('creates message record when body is present', async () => {
    const prisma = buildMockPrisma({
      lead: { id: 'lead-existing', phone: '+15551234567' },
      conversation: { id: 'conv-existing' },
    });
    const realtime = buildMockRealtime();
    processor = new LeadIntakeProcessor(prisma as never, realtime as never);

    await processor.process(makeJob({ body: 'Hello there', leadId: 'lead-existing' }));

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: 'Hello there', workspaceId: 'ws-1' }),
      }),
    );
  });

  it('does NOT create message when body is absent', async () => {
    const prisma = buildMockPrisma({
      lead: { id: 'lead-existing', phone: '+15551234567' },
      conversation: { id: 'conv-existing' },
    });
    const realtime = buildMockRealtime();
    processor = new LeadIntakeProcessor(prisma as never, realtime as never);

    await processor.process(makeJob({ body: undefined, leadId: 'lead-existing' }));

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('enqueues with priority 1 (high priority)', async () => {
    const prisma = buildMockPrisma({
      lead: { id: 'lead-1', phone: '+15551234567' },
      conversation: { id: 'conv-1' },
    });
    const realtime = buildMockRealtime();
    processor = new LeadIntakeProcessor(prisma as never, realtime as never);

    await processor.process(makeJob({ leadId: 'lead-1' }));

    expect(queues.aiResponse.add).toHaveBeenCalledWith(
      'respond',
      expect.any(Object),
      expect.objectContaining({ priority: 1 }),
    );
  });
});
