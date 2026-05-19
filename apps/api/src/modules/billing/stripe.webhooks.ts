import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  BadRequestException,
  RawBodyRequest,
  Req,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IdempotencyService } from '@conversionops/orchestration';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';
import { BillingService } from './billing.service';

@Controller('webhooks/stripe')
@Public()
export class StripeWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  /**
   * Processes Stripe webhooks. Verifies signature, deduplicates via idempotency key,
   * then routes to the appropriate billing service method.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';

    if (!rawBody || !signature) {
      throw new BadRequestException('Missing raw body or stripe signature');
    }

    let event: { id: string; type: string; data: { object: Record<string, unknown> } };
    try {
      event = this.billingService.constructWebhookEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      logger.warn({ err }, 'stripe-webhook: signature verification failed');
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    const idempotencyKey = `stripe:${event.id}`;

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'stripe');
      if (cached !== null) {
        logger.debug({ eventId: event.id }, 'stripe-webhook: duplicate event, returning cached result');
        return { received: true };
      }
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        return { received: true };
      }
      throw err;
    }

    try {
      await this.routeEvent(event);
      await this.idempotencyService.complete(idempotencyKey, { received: true });
    } catch (err) {
      await this.idempotencyService.fail(idempotencyKey).catch(() => undefined);
      logger.error({ err, eventId: event.id, type: event.type }, 'stripe-webhook: event processing failed');
    }

    return { received: true };
  }

  private async routeEvent(event: { id: string; type: string; data: { object: Record<string, unknown> } }): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.billingService.handleSubscriptionCreated(event);
        break;
      case 'customer.subscription.deleted':
        await this.billingService.handleSubscriptionDeleted(event);
        break;
      case 'customer.subscription.updated':
        await this.billingService.handleSubscriptionUpdated(event);
        break;
      case 'invoice.payment_failed':
        await this.billingService.handlePaymentFailed(event);
        break;
      default:
        logger.debug({ type: event.type }, 'stripe-webhook: unhandled event type');
    }
  }
}
