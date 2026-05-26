/**
 * Unit tests for CrmSyncProcessor.
 * Verifies FUB sync, Zapier relay, retry logic, and skip conditions.
 */

jest.mock('@conversionops/orchestration', () => ({
  queues: {
    analyticsIngest: { add: jest.fn().mockResolvedValue(undefined) },
  },
}));

jest.mock('@conversionops/integrations', () => ({
  syncLeadToFUB: jest.fn(),
  ZapierWebhookRelay: jest.fn().mockImplementation(() => ({
    relayLead: jest.fn(),
  })),
}));

jest.mock('@conversionops/observability', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { CrmSyncProcessor } from '../processors/crm-sync.processor';
import { syncLeadToFUB, ZapierWebhookRelay } from '@conversionops/integrations';
import { queues } from '@conversionops/orchestration';
import type { Job } from 'bullmq';
import type { CrmSyncJobData } from '@conversionops/orchestration';

const mockSyncLeadToFUB = syncLeadToFUB as jest.MockedFunction<typeof syncLeadToFUB>;

function makeJob(overrides: Partial<CrmSyncJobData> = {}, attemptsMade = 0): Job<CrmSyncJobData> {
  return {
    data: {
      workspaceId: 'ws-1',
      leadId: 'lead-1',
      event: 'lead.qualified',
      ...overrides,
    },
    attemptsMade,
  } as unknown as Job<CrmSyncJobData>;
}

const LEAD = { id: 'lead-1', workspaceId: 'ws-1', phone: '+15551234567', name: 'Jane Doe', status: 'QUALIFIED', deletedAt: null };
const WORKSPACE_BASE = { id: 'ws-1', name: 'Test Brokerage', timezone: 'America/New_York', aiConfig: {} };

function buildMockPrisma(overrides: {
  lead?: typeof LEAD | null;
  workspace?: typeof WORKSPACE_BASE | null;
} = {}) {
  const lead = overrides.lead !== undefined ? overrides.lead : LEAD;
  const workspace = overrides.workspace !== undefined ? overrides.workspace : WORKSPACE_BASE;
  return {
    lead: { findFirst: jest.fn().mockResolvedValue(lead) },
    workspace: { findUnique: jest.fn().mockResolvedValue(workspace) },
  };
}

describe('CrmSyncProcessor — process()', () => {
  let processor: CrmSyncProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips when lead not found', async () => {
    const prisma = buildMockPrisma({ lead: null });
    processor = new CrmSyncProcessor(prisma as never);

    await processor.process(makeJob());

    expect(mockSyncLeadToFUB).not.toHaveBeenCalled();
  });

  it('skips when workspace not found', async () => {
    const prisma = buildMockPrisma({ workspace: null });
    processor = new CrmSyncProcessor(prisma as never);

    await processor.process(makeJob());

    expect(mockSyncLeadToFUB).not.toHaveBeenCalled();
  });

  it('skips when no CRM configured', async () => {
    const prisma = buildMockPrisma({
      workspace: { ...WORKSPACE_BASE, aiConfig: { crmType: 'none' } },
    });
    processor = new CrmSyncProcessor(prisma as never);

    await processor.process(makeJob());

    expect(mockSyncLeadToFUB).not.toHaveBeenCalled();
  });

  it('calls syncLeadToFUB when fubApiKey present', async () => {
    mockSyncLeadToFUB.mockResolvedValue({ ok: true, value: 'fub-contact-123' } as never);
    const prisma = buildMockPrisma({
      workspace: { ...WORKSPACE_BASE, aiConfig: { fubApiKey: 'fub-key-abc' } },
    });
    processor = new CrmSyncProcessor(prisma as never);

    await processor.process(makeJob());

    expect(mockSyncLeadToFUB).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-1' }),
      expect.objectContaining({ id: 'ws-1' }),
      'fub-key-abc',
      prisma,
    );
  });

  it('enqueues analytics-ingest after successful FUB sync', async () => {
    mockSyncLeadToFUB.mockResolvedValue({ ok: true, value: 'fub-contact-123' } as never);
    const prisma = buildMockPrisma({
      workspace: { ...WORKSPACE_BASE, aiConfig: { fubApiKey: 'fub-key-abc' } },
    });
    processor = new CrmSyncProcessor(prisma as never);

    await processor.process(makeJob());

    expect(queues.analyticsIngest.add).toHaveBeenCalledWith(
      'crm-sync',
      expect.objectContaining({ event: 'crm.sync.result', workspaceId: 'ws-1' }),
      expect.any(Object),
    );
  });

  it('calls ZapierWebhookRelay when zapierWebhookUrl present', async () => {
    const mockRelayLead = jest.fn().mockResolvedValue({ ok: true, value: undefined });
    (ZapierWebhookRelay as jest.Mock).mockImplementation(() => ({ relayLead: mockRelayLead }));

    const prisma = buildMockPrisma({
      workspace: { ...WORKSPACE_BASE, aiConfig: { zapierWebhookUrl: 'https://hooks.zapier.com/xyz' } },
    });
    processor = new CrmSyncProcessor(prisma as never);

    await processor.process(makeJob({ event: 'lead.created' }));

    expect(mockRelayLead).toHaveBeenCalledWith(
      'https://hooks.zapier.com/xyz',
      expect.objectContaining({ id: 'lead-1' }),
      'lead.created',
    );
  });

  it('falls back to lead.qualified for invalid Zapier event type', async () => {
    const mockRelayLead = jest.fn().mockResolvedValue({ ok: true, value: undefined });
    (ZapierWebhookRelay as jest.Mock).mockImplementation(() => ({ relayLead: mockRelayLead }));

    const prisma = buildMockPrisma({
      workspace: { ...WORKSPACE_BASE, aiConfig: { zapierWebhookUrl: 'https://hooks.zapier.com/xyz' } },
    });
    processor = new CrmSyncProcessor(prisma as never);

    await processor.process(makeJob({ event: 'lead.unknown_event' as never }));

    expect(mockRelayLead).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      'lead.qualified',
    );
  });

  it('throws on FUB failure when attempt < MAX_RETRIES (triggers BullMQ retry)', async () => {
    const error = new Error('FUB API timeout');
    mockSyncLeadToFUB.mockResolvedValue({ ok: false, error } as never);

    const prisma = buildMockPrisma({
      workspace: { ...WORKSPACE_BASE, aiConfig: { fubApiKey: 'fub-key-abc' } },
    });
    processor = new CrmSyncProcessor(prisma as never);

    await expect(processor.process(makeJob({}, 0))).rejects.toThrow('FUB API timeout');
  });

  it('does NOT throw on FUB failure when attempt >= MAX_RETRIES', async () => {
    const error = new Error('FUB API timeout');
    mockSyncLeadToFUB.mockResolvedValue({ ok: false, error } as never);

    const prisma = buildMockPrisma({
      workspace: { ...WORKSPACE_BASE, aiConfig: { fubApiKey: 'fub-key-abc' } },
    });
    processor = new CrmSyncProcessor(prisma as never);

    // attempt 3 = MAX_RETRIES, should not throw
    await expect(processor.process(makeJob({}, 3))).resolves.toBeUndefined();
  });
});
