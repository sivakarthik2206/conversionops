import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { queues, IdempotencyService } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';

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

@Controller('webhooks/zillow')
@Public()
export class ZillowWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(private readonly prisma: PrismaService) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  /**
   * Handles Zillow lead webhook intake.
   * Authenticates via x-api-key header mapped to a workspace.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleZillowLead(
    @Body() payload: ZillowLeadPayload,
    @Headers('x-api-key') apiKey: string,
  ): Promise<{ received: boolean }> {
    if (!apiKey) {
      throw new ForbiddenException('Missing API key');
    }

    const sharedSecret = process.env['ZILLOW_WEBHOOK_SECRET'];
    const workspace = sharedSecret && apiKey === sharedSecret
      ? await this.prisma.workspace.findFirst({ where: { deletedAt: null } })
      : await this.prisma.workspace.findFirst({
          where: {
            featureFlags: { path: ['zillowApiKey'], equals: apiKey },
            deletedAt: null,
          },
        });

    if (!workspace) {
      throw new ForbiddenException('Invalid API key');
    }

    const externalId = payload.leadId ?? payload.listingId;

    if (externalId) {
      const idempotencyKey = `zillow:${externalId}`;
      try {
        const cached = await this.idempotencyService.acquire(idempotencyKey, 'zillow', workspace.id);
        if (cached !== null) {
          return { received: true };
        }

        const name =
          [payload.firstName, payload.lastName].filter(Boolean).join(' ') || undefined;

        await queues.leadIntake.add(
          'zillow-lead',
          {
            workspaceId: workspace.id,
            source: 'ZILLOW',
            externalId,
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
        return { received: true };
      } catch (err) {
        if (err instanceof IdempotencyConflictError) return { received: true };
        logger.error({ err, leadId: payload.leadId }, 'zillow: processing error');
        throw err;
      }
    }

    const name = [payload.firstName, payload.lastName].filter(Boolean).join(' ') || undefined;

    await queues.leadIntake.add(
      'zillow-lead',
      {
        workspaceId: workspace.id,
        source: 'ZILLOW',
        name,
        from: payload.phone,
        email: payload.email,
        metadata: { propertyAddress: payload.propertyAddress, rawPayload: payload },
      },
      { removeOnComplete: 500, priority: 2 },
    );

    return { received: true };
  }
}
