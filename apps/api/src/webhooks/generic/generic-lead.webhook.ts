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
import { z } from 'zod';
import { createHash } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { queues, IdempotencyService } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { safeEquals } from '../../common/security/timing-safe';

const GenericLeadSchema = z.object({
  source: z.enum([
    'ZILLOW',
    'REALTOR_COM',
    'WEB_FORM',
    'MISSED_CALL',
    'SMS_INBOUND',
    'MANUAL',
    'REACTIVATION',
    'REFERRAL',
    'OTHER',
  ]),
  name: z.string().max(256).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().max(320).optional(),
  externalId: z.string().max(128).optional(),
  metadata: z.record(z.unknown()).optional(),
});

type GenericLeadDto = z.infer<typeof GenericLeadSchema>;

const MAX_PAYLOAD_BYTES = 32 * 1024;

@Controller('webhooks/lead')
@Public()
export class GenericLeadWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(private readonly prisma: PrismaService) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  /**
   * Universal lead intake.
   *
   * Authentication: Bearer token in Authorization header is matched
   * (timing-safe) against workspace.featureFlags.genericWebhookApiKey.
   * The previous shared-secret fallback attributed unauthenticated traffic
   * to the oldest workspace — that's a cross-tenant attribution bug and
   * has been removed. Each workspace must mint its own key.
   *
   * Idempotency: keyed by (externalId | payload-hash) so retries from any
   * upstream system (FUB, Zapier, custom forms) do not double-create.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async handleGenericLead(
    @Req() req: Request,
    @Body(new ZodValidationPipe(GenericLeadSchema)) dto: GenericLeadDto,
    @Headers('authorization') authorization: string,
  ): Promise<{ queued: boolean; leadId: null }> {
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      throw new PayloadTooLargeException();
    }

    if (!authorization) {
      throw new ForbiddenException('Missing Authorization header');
    }
    const apiKey = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!apiKey) {
      throw new ForbiddenException('Invalid Authorization header format');
    }

    const workspace = await this.resolveWorkspace(apiKey);
    if (!workspace) {
      logger.warn({ keyPrefix: apiKey.slice(0, 6) }, 'generic-lead: invalid api key');
      throw new ForbiddenException('Invalid API key');
    }

    const idempotencyKey = this.buildIdempotencyKey(workspace.id, dto);

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'generic-webhook', workspace.id);
      if (cached !== null) {
        return { queued: true, leadId: null };
      }
    } catch (err) {
      if (err instanceof IdempotencyConflictError) return { queued: true, leadId: null };
      throw err;
    }

    try {
      await queues.leadIntake.add(
        'generic-lead',
        {
          workspaceId: workspace.id,
          source: dto.source,
          name: dto.name,
          from: dto.phone,
          email: dto.email,
          externalId: dto.externalId,
          metadata: dto.metadata,
        },
        { removeOnComplete: 500, priority: 3 },
      );
      await this.idempotencyService.complete(idempotencyKey, { queued: true });
      logger.info({ workspaceId: workspace.id, source: dto.source }, 'generic-lead: queued');
    } catch (err) {
      await this.idempotencyService.fail(idempotencyKey).catch(() => undefined);
      logger.error({ err, workspaceId: workspace.id }, 'generic-lead: enqueue failed');
      throw err;
    }

    return { queued: true, leadId: null };
  }

  private async resolveWorkspace(apiKey: string): Promise<{ id: string } | null> {
    const candidate = await this.prisma.workspace.findFirst({
      where: {
        featureFlags: { path: ['genericWebhookApiKey'], equals: apiKey },
        deletedAt: null,
      },
      select: { id: true, featureFlags: true },
    });
    if (!candidate) return null;
    const stored = (candidate.featureFlags as Record<string, unknown> | null)?.['genericWebhookApiKey'];
    if (typeof stored !== 'string' || !safeEquals(stored, apiKey)) return null;
    return { id: candidate.id };
  }

  private buildIdempotencyKey(workspaceId: string, dto: GenericLeadDto): string {
    if (dto.externalId) return `generic:${workspaceId}:${dto.source}:${dto.externalId}`;
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({
        s: dto.source,
        p: dto.phone ?? '',
        e: dto.email ?? '',
        n: dto.name ?? '',
      }))
      .digest('hex')
      .slice(0, 24);
    return `generic:${workspaceId}:${dto.source}:fp:${fingerprint}`;
  }
}
