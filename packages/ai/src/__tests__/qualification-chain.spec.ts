/**
 * Unit tests for runQualificationChain.
 * Tests guard conditions, extraction logic, and shouldBook detection.
 */

jest.mock('@conversionops/observability', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../memory/conversation-memory', () => ({
  ConversationMemoryManager: jest.fn().mockImplementation(() => ({
    buildContext: jest.fn().mockResolvedValue({
      messages: [],
      totalMessageCount: 3,
    }),
  })),
}));

jest.mock('../governance/token-budget', () => ({
  checkQuota: jest.fn().mockResolvedValue({ allowed: true, used: 1000, limit: 100000, percentUsed: 0.01 }),
}));

import { runQualificationChain } from '../chains/qualification.chain';
import { checkQuota } from '../governance/token-budget';
import { ConversationMemoryManager } from '../memory/conversation-memory';

const mockCheckQuota = checkQuota as jest.MockedFunction<typeof checkQuota>;

const WORKSPACE = {
  id: 'ws-1',
  name: 'Test Brokerage',
  timezone: 'America/New_York',
  aiConfig: { agentName: 'Alex', tone: 'professional and warm' },
} as never;

const LEAD_BASE = {
  id: 'lead-1',
  workspaceId: 'ws-1',
  name: 'Jane Doe',
  qualification: {},
  status: 'QUALIFYING',
} as never;

function buildMockVertex(responseContent = 'Hi Jane, what area are you looking in?') {
  return {
    generateWithRetry: jest.fn().mockResolvedValue({
      ok: true,
      value: {
        content: responseContent,
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 200,
      },
    }),
  } as never;
}

function buildMockPrisma() {
  return {} as never;
}

describe('runQualificationChain — guard conditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckQuota.mockResolvedValue({ allowed: true, used: 1000, limit: 100000, percentUsed: 0.01 });
  });

  it('returns error when token quota exceeded', async () => {
    mockCheckQuota.mockResolvedValue({ allowed: false, used: 100000, limit: 100000, percentUsed: 1 });

    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      LEAD_BASE,
      buildMockVertex(),
      buildMockPrisma(),
    );

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: Error }).error.message).toMatch(/quota exceeded/i);
  });

  it('returns error when max conversation depth exceeded', async () => {
    (ConversationMemoryManager as jest.Mock).mockImplementation(() => ({
      buildContext: jest.fn().mockResolvedValue({
        messages: [],
        totalMessageCount: 21, // > 20 limit
      }),
    }));

    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      LEAD_BASE,
      buildMockVertex(),
      buildMockPrisma(),
    );

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: Error }).error.message).toMatch(/depth exceeded/i);
  });

  it('returns error when AI repetitive loop detected', async () => {
    const sameMessage = 'What area are you looking in?';
    (ConversationMemoryManager as jest.Mock).mockImplementation(() => ({
      buildContext: jest.fn().mockResolvedValue({
        messages: Array.from({ length: 6 }, (_, i) => ({
          role: i % 2 === 0 ? 'AI' : 'HUMAN',
          content: i % 2 === 0 ? sameMessage : 'reply',
        })),
        totalMessageCount: 6,
      }),
    }));

    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      LEAD_BASE,
      buildMockVertex(),
      buildMockPrisma(),
    );

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: Error }).error.message).toMatch(/loop detected/i);
  });

  it('propagates vertex generation error', async () => {
    (ConversationMemoryManager as jest.Mock).mockImplementation(() => ({
      buildContext: jest.fn().mockResolvedValue({ messages: [], totalMessageCount: 2 }),
    }));

    const failingVertex = {
      generateWithRetry: jest.fn().mockResolvedValue({ ok: false, error: new Error('Vertex timeout') }),
    } as never;

    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      LEAD_BASE,
      failingVertex,
      buildMockPrisma(),
    );

    expect(result.ok).toBe(false);
  });
});

describe('runQualificationChain — data extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckQuota.mockResolvedValue({ allowed: true, used: 1000, limit: 100000, percentUsed: 0.01 });
    (ConversationMemoryManager as jest.Mock).mockImplementation(() => ({
      buildContext: jest.fn().mockResolvedValue({
        messages: [
          { role: 'HUMAN', content: 'I am pre-approved and want to buy in Austin asap, budget $500k' },
        ],
        totalMessageCount: 1,
      }),
    }));
  });

  it('returns ok=true with content and extractedData', async () => {
    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      LEAD_BASE,
      buildMockVertex('Great! We have options in Austin.'),
      buildMockPrisma(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.content).toBeTruthy();
    expect(result.value.inputTokens).toBe(100);
    expect(result.value.outputTokens).toBe(50);
  });

  it('extracts financing from conversation history', async () => {
    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      LEAD_BASE,
      buildMockVertex('Great! We have cash buyer options.'),
      buildMockPrisma(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // "pre-approved" in the message should map to 'pre_approved'
    expect(result.value.updatedQualification.financing).toBe('pre_approved');
  });

  it('does not overwrite existing qualification fields', async () => {
    const leadWithQual = {
      id: 'lead-1',
      workspaceId: 'ws-1',
      name: 'Jane Doe',
      status: 'QUALIFYING',
      qualification: { financing: 'cash' }, // already set — must not be overwritten
    } as never;

    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      leadWithQual,
      buildMockVertex('Here are some options.'),
      buildMockPrisma(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 'cash' should not be overwritten by 'pre_approved' from conversation
    expect(result.value.updatedQualification.financing).toBe('cash');
  });
});

describe('runQualificationChain — shouldBook detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckQuota.mockResolvedValue({ allowed: true, used: 1000, limit: 100000, percentUsed: 0.01 });
  });

  it('sets shouldBook=true when AI response contains booking signal', async () => {
    (ConversationMemoryManager as jest.Mock).mockImplementation(() => ({
      buildContext: jest.fn().mockResolvedValue({ messages: [], totalMessageCount: 2 }),
    }));

    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      LEAD_BASE,
      buildMockVertex('Would you like to schedule a call with our agent?'),
      buildMockPrisma(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.shouldBook).toBe(true);
  });

  it('sets shouldBook=true when 5+ fields are answered', async () => {
    const wellQualifiedLead = {
      id: 'lead-1',
      workspaceId: 'ws-1',
      name: 'Jane Doe',
      status: 'QUALIFYING',
      qualification: {
        budget: '$500k',
        timeline: '30_days',
        financing: 'pre_approved',
        area: 'Austin',
        propertyType: 'single_family',
      },
    } as never;

    (ConversationMemoryManager as jest.Mock).mockImplementation(() => ({
      buildContext: jest.fn().mockResolvedValue({ messages: [], totalMessageCount: 2 }),
    }));

    const result = await runQualificationChain(
      'conv-1',
      WORKSPACE,
      wellQualifiedLead,
      buildMockVertex('Here are some great homes in Austin.'),
      buildMockPrisma(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.shouldBook).toBe(true);
  });
});
