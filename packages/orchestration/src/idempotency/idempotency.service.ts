import { PrismaClient, Prisma } from '@conversionops/db';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';

export class IdempotencyService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Acquires an idempotency key for deduplication.
   * Returns cached result if COMPLETED, throws IdempotencyConflictError if PROCESSING,
   * deletes and returns null if FAILED, creates PROCESSING record and returns null if new.
   * @param key - Unique idempotency key (e.g. "twilio:sms:SM123")
   * @param source - Source system (e.g. "twilio", "stripe")
   * @param workspaceId - Optional workspace scope
   * @returns Cached result or null for new requests — never throws except on conflict
   */
  async acquire(key: string, source: string, workspaceId?: string): Promise<unknown> {
    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key } });

    if (existing) {
      if (existing.status === 'COMPLETED') return existing.result;
      if (existing.status === 'PROCESSING') throw new IdempotencyConflictError(key);
      if (existing.status === 'FAILED') {
        await this.prisma.idempotencyKey.delete({ where: { key } });
      }
    }

    await this.prisma.idempotencyKey.create({
      data: {
        key,
        source,
        status: 'PROCESSING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ...(workspaceId ? { workspaceId } : {}),
      },
    });
    return null;
  }

  /**
   * Marks a key as COMPLETED and stores the serialized result.
   * @param key - The idempotency key to resolve
   * @param result - The result to cache for future duplicate requests
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
   * @param key - The idempotency key to fail
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
   * @returns Number of deleted records
   */
  async purgeExpired(): Promise<number> {
    const { count } = await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  }
}
