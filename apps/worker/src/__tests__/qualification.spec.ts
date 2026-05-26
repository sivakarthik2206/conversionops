/**
 * Unit tests for QualificationProcessor.
 * Verifies score computation, tier assignment, and state machine transitions.
 */

jest.mock('@conversionops/orchestration', () => ({
  queues: {
    leadRouting:    { add: jest.fn().mockResolvedValue(undefined) },
    analyticsIngest: { add: jest.fn().mockResolvedValue(undefined) },
  },
  EventStore: jest.fn().mockImplementation(() => ({
    append: jest.fn().mockResolvedValue({}),
  })),
  transitionLead: jest.fn(),
}));

jest.mock('@conversionops/ai', () => ({
  updateLeadScore: jest.fn().mockResolvedValue(undefined),
  calculateScore: jest.fn(),
  getTier: jest.fn(),
}));

jest.mock('@conversionops/observability', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { QualificationProcessor } from '../processors/qualification.processor';
import { queues, transitionLead } from '@conversionops/orchestration';
import { calculateScore, getTier } from '@conversionops/ai';
import type { Job } from 'bullmq';
import type { QualificationJobData } from '@conversionops/orchestration';
import { LeadStatus, LeadTier } from '@conversionops/db';

const mockTransitionLead = transitionLead as jest.MockedFunction<typeof transitionLead>;
const mockCalculateScore  = calculateScore  as jest.MockedFunction<typeof calculateScore>;
const mockGetTier         = getTier         as jest.MockedFunction<typeof getTier>;

function makeJob(overrides: Partial<QualificationJobData> = {}): Job<QualificationJobData> {
  return {
    data: {
      workspaceId: 'ws-1',
      leadId: 'lead-1',
      conversationId: 'conv-1',
      ...overrides,
    },
  } as unknown as Job<QualificationJobData>;
}

const PARTIAL_QUALIFICATION = {
  budget: '400000',
  timeline: '30_days',
  financing: 'pre_approved',
  // area, propertyType, urgency, intent NOT set
};

const FULL_QUALIFICATION = {
  budget: '400000',
  timeline: '30_days',
  financing: 'pre_approved',
  area: 'Austin',
  propertyType: 'single_family',
  urgency: 'immediate',
  intent: 'buy',
};

function buildMockPrisma(overrides: {
  lead?: {
    id: string;
    workspaceId: string;
    status: LeadStatus;
    qualification: Record<string, string>;
  } | null;
  messageCount?: number;
} = {}) {
  const lead = overrides.lead !== undefined ? overrides.lead : {
    id: 'lead-1',
    workspaceId: 'ws-1',
    status: LeadStatus.QUALIFYING,
    qualification: PARTIAL_QUALIFICATION,
  };

  return {
    lead: {
      findFirst: jest.fn().mockResolvedValue(lead),
      update: jest.fn().mockResolvedValue({ ...lead, status: LeadStatus.QUALIFIED }),
    },
    message: {
      count: jest.fn().mockResolvedValue(overrides.messageCount ?? 5),
    },
  };
}

describe('QualificationProcessor — process()', () => {
  let processor: QualificationProcessor;
  const mockRealtime = { emitToWorkspace: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateScore.mockReturnValue(65);
    mockGetTier.mockReturnValue(LeadTier.HOT);
  });

  it('skips when lead not found', async () => {
    const prisma = buildMockPrisma({ lead: null });
    processor = new QualificationProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(queues.leadRouting.add).not.toHaveBeenCalled();
  });

  it('emits lead:scored realtime event', async () => {
    const prisma = buildMockPrisma();
    processor = new QualificationProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(mockRealtime.emitToWorkspace).toHaveBeenCalledWith(
      'ws-1',
      'lead:scored',
      expect.objectContaining({ leadId: 'lead-1' }),
    );
  });

  it('does NOT enqueue routing when partially qualified', async () => {
    const prisma = buildMockPrisma({
      lead: { id: 'lead-1', workspaceId: 'ws-1', status: LeadStatus.QUALIFYING, qualification: PARTIAL_QUALIFICATION },
    });
    processor = new QualificationProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(queues.leadRouting.add).not.toHaveBeenCalled();
  });

  it('transitions to QUALIFIED and enqueues routing when fully qualified', async () => {
    mockTransitionLead.mockReturnValue(LeadStatus.QUALIFIED);
    const prisma = buildMockPrisma({
      lead: { id: 'lead-1', workspaceId: 'ws-1', status: LeadStatus.QUALIFYING, qualification: FULL_QUALIFICATION },
    });
    processor = new QualificationProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1', workspaceId: 'ws-1' },
      }),
    );
    expect(queues.leadRouting.add).toHaveBeenCalled();
  });

  it('enqueues analytics-ingest on every qualification pass', async () => {
    const prisma = buildMockPrisma();
    processor = new QualificationProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(queues.analyticsIngest.add).toHaveBeenCalledWith(
      'analytics-ingest',
      expect.objectContaining({ event: 'lead.scored' }),
      expect.any(Object),
    );
  });

  it('does NOT transition CONTACTED → QUALIFIED if not fully qualified', async () => {
    const prisma = buildMockPrisma({
      lead: { id: 'lead-1', workspaceId: 'ws-1', status: LeadStatus.CONTACTED, qualification: PARTIAL_QUALIFICATION },
    });
    processor = new QualificationProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});

describe('QualificationProcessor — fully qualified from CONTACTED (edge case)', () => {
  const mockRealtime = { emitToWorkspace: jest.fn() };

  it('transitions CONTACTED → QUALIFYING → QUALIFIED when all 7 fields answered', async () => {
    // First transitionLead: CONTACTED → QUALIFYING
    // Second transitionLead: QUALIFYING → QUALIFIED
    mockTransitionLead
      .mockReturnValueOnce(LeadStatus.QUALIFYING)
      .mockReturnValueOnce(LeadStatus.QUALIFIED);

    const prisma = buildMockPrisma({
      lead: { id: 'lead-1', workspaceId: 'ws-1', status: LeadStatus.CONTACTED, qualification: FULL_QUALIFICATION },
    });
    const processor = new QualificationProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.lead.update).toHaveBeenCalled();
    expect(queues.leadRouting.add).toHaveBeenCalled();
  });
});
