import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  PayloadTooLargeException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { queues, IdempotencyService } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { safeEquals } from '../../common/security/timing-safe';

interface ZillowLeadPayload {
  leadId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  propertyAddress?: string;
  listingId?: string;
  message?: string;
  [key: string]: unknown;
}

const MAX_PAYLOAD_BYTES = 32 * 1024;

@Controller('webhooks/zillow')
@Public()
export class ZillowWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(private readonly prisma: PrismaService) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  /**
   * Zillow lead intake.
   *
   * Authentication: x-api-key header is matched (timing-safe) against
   * workspace.featureFlags.zillowApiKey. We do NOT honour a shared secret
   * fallback that attributes to "first workspace" — that's a cross-tenant
   * attribution bug. Each workspace must mint its own key.
   *
   * Idempotency: keyed by (leadId | listingId | payload-hash). The previous
   * implementation enqueued payloads with no external ID without any dedupe,
   * so Zillow retries would create duplicate leads.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleZillowLead(
    @Req() req: Request,
    @Body() payload: ZillowLeadPayload,
    @Headers('x-api-key') apiKey: string,
  ): Promise<{ received: boolean }> {
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      throw new PayloadTooLargeException();
    }

    if (!apiKey) {
      throw new ForbiddenException('Missing API key');
    }

    const workspace = await this.resolveWorkspace(apiKey);
    if (!workspace) {
      logger.warn({ keyPrefix: apiKey.slice(0, 6) }, 'zillow: invalid api key');
      throw new ForbiddenException('Invalid API key');
    }

    const idempotencyKey = this.buildIdempotencyKey(workspace.id, payload);

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'zillow', workspace.id);
      if (cached !== null) {
        return { received: true };
      }
    } catch (err) {
      if (err instanceof IdempotencyConflictError) return { received: true };
      throw err;
    }

    try {
      const name = [payload.firstName, payload.lastName].filter(Boolean).join(' ') || undefined;
      await queues.leadIntake.add(
        'zillow-lead',
        {
          workspaceId: workspace.id,
          source: 'ZILLOW',
          externalId: payload.leadId ?? payload.listingId,
          name,
          from: payload.phone,
          email: payload.email,
          metadata: {
            propertyAddress: payload.propertyAddress,
            listingId: payload.listingId,
            message: payload.message,
            rawPayload: payload,
          },
        },
        { removeOnComplete: 500, priority: 2 },
      );
      await this.idempotencyService.complete(idempotencyKey, { queued: true });
    } catch (err) {
      await this.idempotencyService.fail(idempotencyKey).catch(() => undefined);
      logger.error({ err, workspaceId: workspace.id }, 'zillow: enqueue failed');
      throw err;
    }

    return { received: true };
  }

  /**
   * Resolves an API key to a workspace via featureFlags.zillowApiKey.
   *
   * Uses a single query then a timing-safe compare; we never expose
   * "key is valid for *some* workspace" before confirming it's valid for
   * *this* workspace.
   */
  private async resolveWorkspace(apiKey: string): Promise<{ id: string } | null> {
    const candidate = await this.prisma.workspace.findFirst({
      where: {
        featureFlags: { path: ['zillowApiKey'], equals: apiKey },
        deletedAt: null,
      },
      select: { id: true, featureFlags: true },
    });
    if (!candidate) return null;
    const stored = (candidate.featureFlags as Record<string, unknown> | null)?.['zillowApiKey'];
    if (typeof stored !== 'string' || !safeEquals(stored, apiKey)) return null;
    return { id: candidate.id };
  }

  private buildIdempotencyKey(workspaceId: string, payload: ZillowLeadPayload): string {
    const explicit = payload.leadId ?? payload.listingId;
    if (explicit) return `zillow:${workspaceId}:${explicit}`;
    // Hash a stable subset of fields so retries with no external ID still dedupe.
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({
        p: payload.phone ?? '',
        e: payload.email ?? '',
        a: payload.propertyAddress ?? '',
        m: payload.message ?? '',
      }))
      .digest('hex')
      .slice(0, 24);
    return `zillow:${workspaceId}:fp:${fingerprint}`;
  }
}
