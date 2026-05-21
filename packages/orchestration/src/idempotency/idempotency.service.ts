import { PrismaClient, Prisma } from '@conversionops/db';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';

/**
 * PROCESSING records older than this are considered abandoned (handler crashed,
 * pod was killed mid-flight) and are reclaimed by the next caller. Without this,
 * a single crashed handler permanently 409s every retry of the same external event.
 */
const STALE_PROCESSING_MS = 60 * 1000;

const TTL_MS = 24 * 60 * 60 * 1000;

const PRISMA_UNIQUE_VIOLATION = 'P2002';

export class IdempotencyService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Reserves an idempotency key.
   *
   * Returns the cached result if the key is COMPLETED (caller should treat as duplicate).
   * Returns null if the caller now owns the key and must proceed with processing.
   * Throws IdempotencyConflictError if another in-flight call is currently processing
   * this key (and it has not gone stale).
   *
   * Race-safe: relies on the (key) unique constraint. Two concurrent callers cannot
   * both win the create() — the loser sees P2002 and re-reads to determine state.
   *
   * Stale-safe: a PROCESSING row older than STALE_PROCESSING_MS is treated as
   * abandoned and reclaimed by the next caller. Without this, a crashed handler
   * would deadlock every retry of the same event.
   */
  async acquire(key: string, source: string, workspaceId?: string): Promise<unknown> {
    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key } });

    if (existing) {
      if (existing.status === 'COMPLETED') return existing.result;

      if (existing.status === 'PROCESSING') {
        const ageMs = Date.now() - existing.createdAt.getTime();
        if (ageMs < STALE_PROCESSING_MS) {
          throw new IdempotencyConflictError(key);
        }
        // Reclaim a stale PROCESSING row — handler crashed or pod died.
        await this.prisma.idempotencyKey
          .updateMany({
            where: { key, status: 'PROCESSING', createdAt: existing.createdAt },
            data: {
              status: 'PROCESSING',
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + TTL_MS),
            },
          })
          .catch(() => undefined);
        return null;
      }

      if (existing.status === 'FAILED') {
        // Allow retry: delete and fall through to create. If another caller wins
        // the create, we'll catch P2002 below.
        await this.prisma.idempotencyKey
          .delete({ where: { key } })
          .catch(() => undefined);
      }
    }

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key,
          source,
          status: 'PROCESSING',
          expiresAt: new Date(Date.now() + TTL_MS),
          ...(workspaceId ? { workspaceId } : {}),
        },
      });
      return null;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        // Another concurrent caller created the row first. Re-read and decide.
        const row = await this.prisma.idempotencyKey.findUnique({ where: { key } });
        if (!row) {
          // Race: row was deleted between create() and re-read. Treat as conflict.
          throw new IdempotencyConflictError(key);
        }
        if (row.status === 'COMPLETED') return row.result;
        throw new IdempotencyConflictError(key);
      }
      throw err;
    }
  }

  /**
   * Marks a key as COMPLETED and stores the serialized result.
   */
  async complete(key: string, result: unknown): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { key },
      data: {
        status: 'COMPLETED',
        result: result as Prisma.InputJsonValue,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Marks a key as FAILED so the next attempt can retry.
   */
  async fail(key: string): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { key },
      data: { status: 'FAILED', resolvedAt: new Date() },
    });
  }

  /**
   * Deletes all idempotency records past their expiry time.
   * Intended for a nightly cron job.
   */
  async purgeExpired(): Promise<number> {
    const { count } = await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  }
}
