/**
 * Stripe webhooks — DEPRECATED. Stripe has been replaced by Paddle.
 * This controller is kept as a stub so existing deployments don't 404 on
 * any in-flight Stripe events. It returns 200 immediately and does nothing.
 */
import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

@Controller('webhooks/stripe')
@Public()
export class StripeWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(): Promise<{ received: boolean }> {
    // Stripe is no longer used. Return 200 to stop Stripe retries.
    return { received: true };
  }
}
