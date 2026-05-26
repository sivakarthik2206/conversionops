/**
 * Unit tests for EventStore.
 * Verifies append (with sequence numbering), getHistory ordering, and replay projection.
 */

import { EventStore } from '../events/event-store';
import { LeadStatus } from '@conversionops/db';

function makePrismaEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'evt-1',
    leadId: 'lead-1',
    workspaceId: 'ws-1',
    sequence: 1,
    type: 'lead.created',
    payload: {},
    triggeredBy: null,
    triggerSource: null,
    correlationId: null,
    occurredAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildMockPrisma(overrides: {
  lastEvent?: Record<string, unknown> | null;
  events?: Record<string, unknown>[];
} = {}) {
  const lastEvent = overrides.lastEvent !== undefined ? overrides.lastEvent : null;
  const events = overrides.events ?? [];

  return {
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        leadEvent: {
          findFirst: jest.fn().mockResolvedValue(lastEvent),
          create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
            ...makePrismaEvent(),
            ...data,
          })),
        },
      };
      return fn(tx);
    }),
    leadEvent: {
      findMany: jest.fn().mockResolvedValue(events),
    },
  };
}

describe('EventStore — append()', () => {
  it('creates event with sequence 1 when no prior events', async () => {
    const prisma = buildMockPrisma({ lastEvent: null });
    const store = new EventStore(prisma as never);

    await store.append({
      leadId: 'lead-1',
      workspaceId: 'ws-1',
      type: 'lead.created',
      triggeredBy: 'system',
    });

    const txFn = prisma.$transaction.mock.calls[0]?.[0];
    const tx = {
      leadEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(makePrismaEvent({ sequence: 1 })),
      },
    };
    await txFn(tx);

    expect(tx.leadEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sequence: 1, type: 'lead.created' }),
      }),
    );
  });

  it('increments sequence from last event', async () => {
    const prisma = buildMockPrisma({ lastEvent: makePrismaEvent({ sequence: 4 }) });
    const store = new EventStore(prisma as never);

    const txFn = async (fn: (tx: unknown) => unknown) => {
      const tx = {
        leadEvent: {
          findFirst: jest.fn().mockResolvedValue(makePrismaEvent({ sequence: 4 })),
          create: jest.fn().mockResolvedValue(makePrismaEvent({ sequence: 5 })),
        },
      };
      const result = await fn(tx);
      expect(tx.leadEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sequence: 5 }) }),
      );
      return result;
    };

    const prisma2 = { $transaction: jest.fn().mockImplementation(txFn), leadEvent: { findMany: jest.fn() } };
    const store2 = new EventStore(prisma2 as never);

    await store2.append({ leadId: 'lead-1', workspaceId: 'ws-1', type: 'lead.scored' });
  });

  it('stores payload, triggeredBy, correlationId', async () => {
    const prisma = buildMockPrisma();
    const store = new EventStore(prisma as never);

    const txFn = async (fn: (tx: unknown) => unknown) => {
      const tx = {
        leadEvent: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(makePrismaEvent()),
        },
      };
      await fn(tx);
      expect(tx.leadEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            triggeredBy: 'ai-worker',
            correlationId: 'corr-abc',
            payload: { score: 75 },
          }),
        }),
      );
    };

    const prisma2 = { $transaction: jest.fn().mockImplementation(txFn), leadEvent: { findMany: jest.fn() } };
    await new EventStore(prisma2 as never).append({
      leadId: 'lead-1',
      workspaceId: 'ws-1',
      type: 'lead.scored',
      payload: { score: 75 },
      triggeredBy: 'ai-worker',
      correlationId: 'corr-abc',
    });
  });
});

describe('EventStore — getHistory()', () => {
  it('returns events ordered by sequence ascending', async () => {
    const events = [
      makePrismaEvent({ sequence: 1, type: 'lead.created' }),
      makePrismaEvent({ sequence: 2, type: 'lead.contacted', id: 'evt-2' }),
      makePrismaEvent({ sequence: 3, type: 'lead.scored', id: 'evt-3' }),
    ];
    const prisma = buildMockPrisma({ events });
    const store = new EventStore(prisma as never);

    const history = await store.getHistory('lead-1');

    expect(history).toHaveLength(3);
    expect(history[0]?.type).toBe('lead.created');
    expect(history[2]?.type).toBe('lead.scored');
    expect(prisma.leadEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { leadId: 'lead-1' }, orderBy: { sequence: 'asc' } }),
    );
  });

  it('returns empty array for a lead with no events', async () => {
    const prisma = buildMockPrisma({ events: [] });
    const store = new EventStore(prisma as never);

    const history = await store.getHistory('unknown-lead');

    expect(history).toEqual([]);
  });
});

describe('EventStore — replay()', () => {
  it('returns null when lead has no events', async () => {
    const prisma = buildMockPrisma({ events: [] });
    const store = new EventStore(prisma as never);

    const state = await store.replay('lead-1');

    expect(state).toBeNull();
  });

  it('projects lead.created → NEW status', async () => {
    const prisma = buildMockPrisma({
      events: [makePrismaEvent({ type: 'lead.created', sequence: 1 })],
    });
    const store = new EventStore(prisma as never);

    const state = await store.replay('lead-1');

    expect(state?.status).toBe(LeadStatus.NEW);
    expect(state?.eventCount).toBe(1);
  });

  it('projects full lifecycle: created → contacted → qualifying → qualified', async () => {
    const events = [
      makePrismaEvent({ sequence: 1, type: 'lead.created', occurredAt: new Date('2025-01-01') }),
      makePrismaEvent({ sequence: 2, type: 'lead.contacted', id: 'evt-2', occurredAt: new Date('2025-01-02') }),
      makePrismaEvent({ sequence: 3, type: 'lead.qualification.started', id: 'evt-3', occurredAt: new Date('2025-01-03') }),
      makePrismaEvent({ sequence: 4, type: 'lead.qualification.completed', id: 'evt-4', occurredAt: new Date('2025-01-04') }),
    ];
    const prisma = buildMockPrisma({ events });
    const store = new EventStore(prisma as never);

    const state = await store.replay('lead-1');

    expect(state?.status).toBe(LeadStatus.QUALIFIED);
    expect(state?.eventCount).toBe(4);
    expect(state?.lastEventType).toBe('lead.qualification.completed');
  });

  it('projects lead.scored event to update score', async () => {
    const events = [
      makePrismaEvent({ sequence: 1, type: 'lead.created' }),
      makePrismaEvent({ sequence: 2, type: 'lead.scored', id: 'evt-2', payload: { score: 82 } }),
    ];
    const prisma = buildMockPrisma({ events });
    const store = new EventStore(prisma as never);

    const state = await store.replay('lead-1');

    expect(state?.score).toBe(82);
  });

  it('projects lead.assigned to set assignedTo', async () => {
    const events = [
      makePrismaEvent({ sequence: 1, type: 'lead.created' }),
      makePrismaEvent({ sequence: 2, type: 'lead.assigned', id: 'evt-2', payload: { workspaceUserId: 'agent-42' } }),
    ];
    const prisma = buildMockPrisma({ events });
    const store = new EventStore(prisma as never);

    const state = await store.replay('lead-1');

    expect(state?.assignedTo).toBe('agent-42');
  });
});
