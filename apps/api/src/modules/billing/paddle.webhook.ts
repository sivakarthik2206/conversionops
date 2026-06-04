import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
  Req,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PaddleService, PaddleWebhookPayload } from './paddle.service';
import { IdempotencyService } from '@conversionops/orchestration';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';

@Controller('webhooks/paddle')
@Public()
export class PaddleWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paddleService: PaddleService,
  ) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePaddleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('paddle-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody?.toString() ?? '';

    if (!rawBody || !signature) {
      throw new BadRequestException('Missing raw body or Paddle-Signature header');
    }

    if (!this.paddleService.verifyPaddleWebhook(rawBody, signature)) {
      logger.warn({}, 'paddle-webhook: signature verification failed');
      throw new BadRequestException('Invalid Paddle webhook signature');
    }

    const payload = JSON.parse(rawBody) as PaddleWebhookPayload;
    const idempotencyKey = `paddle:${payload.event_id}`;

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'paddle');
      if (cached !== null) {
        logger.debug({ eventId: payload.event_id }, 'paddle-webhook: duplicate, returning cached');
        return { received: true };
      }
    } catch (err) {
      if (err instanceof IdempotencyConflictError) return { received: true };
      throw err;
    }

    try {
      await this.routeEvent(payload);
      await this.idempotencyService.complete(idempotencyKey, { received: true });
    } catch (err) {
      await this.idempotencyService.fail(idempotencyKey).catch(() => undefined);
      logger.error({ err, eventId: payload.event_id, type: payload.event_type }, 'paddle-webhook: processing failed');
    }

    return { received: true };
  }

  private async routeEvent(payload: PaddleWebhookPayload): Promise<void> {
    logger.info({ eventType: payload.event_type, eventId: payload.event_id }, 'paddle-webhook: routing event');
    switch (payload.event_type) {
      case 'subscription.activated':
        await this.paddleService.handleSubscriptionActivated(payload);
        break;
      case 'subscription.cancelled':
        await this.paddleService.handleSubscriptionCancelled(payload);
        break;
      case 'subscription.updated':
        await this.paddleService.handleSubscriptionUpdated(payload);
        break;
      default:
        logger.debug({ type: payload.event_type }, 'paddle-webhook: unhandled event type');
    }
  }
}
