/**
 * Unit tests for IdempotencyService.
 * Verifies key reservation, duplicate detection, stale reclaim, and purge.
 */

import { IdempotencyService } from '../idempotency/idempotency.service';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { Prisma } from '@conversionops/db';

function makeUniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '5.0.0',
    meta: {},
  });
}

function buildMockPrisma(overrides: {
  existing?: Record<string, unknown> | null;
  rereadRow?: Record<string, unknown> | null;
  createShouldThrowUnique?: boolean;
} = {}) {
  let findCallCount = 0;

  return {
    idempotencyKey: {
      findUnique: jest.fn().mockImplementation(async () => {
        findCallCount++;
        if (findCallCount === 1) return overrides.existing ?? null;
        return overrides.rereadRow ?? null;
      }),
      create: jest.fn().mockImplementation(async () => {
        if (overrides.createShouldThrowUnique) {
          throw makeUniqueViolation();
        }
        return {};
      }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
  };
}

describe('IdempotencyService — acquire()', () => {
  it('returns null when key does not exist (caller owns the key)', async () => {
    const prisma = buildMockPrisma({ existing: null });
    const svc = new IdempotencyService(prisma as never);

    const result = await svc.acquire('twilio:sms:SM123', 'twilio', 'ws-1');

    expect(result).toBeNull();
    expect(prisma.idempotencyKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ key: 'twilio:sms:SM123', status: 'PROCESSING' }),
      }),
    );
  });

  it('returns cached result when key is COMPLETED (duplicate delivery)', async () => {
    const cachedResult = { processed: true };
    const prisma = buildMockPrisma({
      existing: { status: 'COMPLETED', result: cachedResult, key: 'twilio:sms:SM123', createdAt: new Date() },
    });
    const svc = new IdempotencyService(prisma as never);

    const result = await svc.acquire('twilio:sms:SM123', 'twilio');

    expect(result).toEqual(cachedResult);
    expect(prisma.idempotencyKey.create).not.toHaveBeenCalled();
  });

  it('throws IdempotencyConflictError when key is PROCESSING and not stale', async () => {
    const freshProcessing = {
      status: 'PROCESSING',
      key: 'twilio:sms:SM999',
      createdAt: new Date(), // just now — not stale
    };
    const prisma = buildMockPrisma({ existing: freshProcessing });
    const svc = new IdempotencyService(prisma as never);

    await expect(svc.acquire('twilio:sms:SM999', 'twilio')).rejects.toThrow(IdempotencyConflictError);
  });

  it('reclaims a stale PROCESSING key (handler crashed)', async () => {
    const staleDate = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
    const staleProcessing = {
      status: 'PROCESSING',
      key: 'twilio:sms:SM777',
      createdAt: staleDate,
    };
    const prisma = buildMockPrisma({ existing: staleProcessing });
    const svc = new IdempotencyService(prisma as never);

    const result = await svc.acquire('twilio:sms:SM777', 'twilio', 'ws-1');

    expect(result).toBeNull();
    expect(prisma.idempotencyKey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ key: 'twilio:sms:SM777', status: 'PROCESSING' }),
      }),
    );
  });

  it('deletes FAILED key and allows retry', async () => {
    const failedKey = { status: 'FAILED', key: 'twilio:sms:SMA1', createdAt: new Date() };
    const prisma = buildMockPrisma({ existing: failedKey });
    const svc = new IdempotencyService(prisma as never);

    const result = await svc.acquire('twilio:sms:SMA1', 'twilio');

    expect(result).toBeNull();
    expect(prisma.idempotencyKey.delete).toHaveBeenCalledWith({ where: { key: 'twilio:sms:SMA1' } });
    expect(prisma.idempotencyKey.create).toHaveBeenCalled();
  });

  it('throws IdempotencyConflictError on concurrent create (P2002) when re-read returns PROCESSING', async () => {
    const prisma = buildMockPrisma({
      existing: null,
      createShouldThrowUnique: true,
      rereadRow: { status: 'PROCESSING', key: 'race-key', createdAt: new Date() },
    });
    const svc = new IdempotencyService(prisma as never);

    await expect(svc.acquire('race-key', 'twilio')).rejects.toThrow(IdempotencyConflictError);
  });

  it('returns cached result on P2002 when concurrent caller already COMPLETED', async () => {
    const cachedResult = { done: true };
    const prisma = buildMockPrisma({
      existing: null,
      createShouldThrowUnique: true,
      rereadRow: { status: 'COMPLETED', result: cachedResult, key: 'race-key', createdAt: new Date() },
    });
    const svc = new IdempotencyService(prisma as never);

    const result = await svc.acquire('race-key', 'twilio');

    expect(result).toEqual(cachedResult);
  });
});

describe('IdempotencyService — complete() and fail()', () => {
  it('marks key as COMPLETED with result', async () => {
    const prisma = buildMockPrisma();
    const svc = new IdempotencyService(prisma as never);

    await svc.complete('twilio:sms:SM123', { leadId: 'lead-1' });

    expect(prisma.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'twilio:sms:SM123' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('marks key as FAILED', async () => {
    const prisma = buildMockPrisma();
    const svc = new IdempotencyService(prisma as never);

    await svc.fail('twilio:sms:SM123');

    expect(prisma.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'twilio:sms:SM123' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });
});

describe('IdempotencyService — purgeExpired()', () => {
  it('deletes expired keys and returns count', async () => {
    const prisma = buildMockPrisma();
    const svc = new IdempotencyService(prisma as never);

    const count = await svc.purgeExpired();

    expect(count).toBe(3);
    expect(prisma.idempotencyKey.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ expiresAt: expect.any(Object) }) }),
    );
  });
});
