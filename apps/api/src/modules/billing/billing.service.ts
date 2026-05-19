import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeLib = require('stripe');
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';
import { PrismaService } from '../prisma/prisma.service';

interface StripeEventBase {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface CheckoutSession {
  metadata?: Record<string, string>;
  subscription?: string | { id: string };
  url?: string;
}

interface StripeSubscription {
  id: string;
  metadata?: Record<string, string>;
  items: { data: Array<{ price?: { id: string } }> };
}

interface StripeInvoice {
  customer?: string | { id?: string };
}

const PLAN_PRICE_MAP: Record<string, string> = {
  SOLO: process.env['STRIPE_SOLO_PRICE_ID'] ?? '',
  BROKERAGE: process.env['STRIPE_BROKERAGE_PRICE_ID'] ?? '',
  ENTERPRISE: process.env['STRIPE_ENTERPRISE_PRICE_ID'] ?? '',
};

function getPlanFromPriceId(priceId: string): string {
  for (const [plan, pid] of Object.entries(PLAN_PRICE_MAP)) {
    if (pid === priceId) return plan;
  }
  return 'SOLO';
}

@Injectable()
export class BillingService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly stripe: Record<string, any>;

  constructor(private readonly prisma: PrismaService) {
    // Using require() because stripe@22 exports via 'export =' pattern
    const StripeConstructor = StripeLib.default ?? StripeLib;
    this.stripe = new StripeConstructor(process.env['STRIPE_SECRET_KEY'] ?? '', {
      apiVersion: '2026-04-22.dahlia',
    });
  }

  /**
   * Creates a Stripe Checkout session for subscription purchase.
   * Lazily creates a Stripe customer if one doesn't exist yet.
   */
  async createCheckoutSession(
    workspaceId: string,
    priceId: string,
  ): Promise<Result<string>> {
    try {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: workspaceId, deletedAt: null },
      });

      if (!workspace) {
        return { ok: false, error: new Error('Workspace not found') };
      }

      let customerId = workspace.stripeCustomerId;

      if (!customerId) {
        const customer = await this.stripe['customers'].create({
          email: workspace.ownerEmail,
          metadata: { workspaceId },
        });
        customerId = (customer as { id: string }).id;

        await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: { stripeCustomerId: customerId },
        });
      }

      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

      const session = await this.stripe['checkout'].sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/settings/billing?success=true`,
        cancel_url: `${appUrl}/settings/billing?cancelled=true`,
        metadata: { workspaceId },
      }) as CheckoutSession;

      return { ok: true, value: session.url ?? '' };
    } catch (err) {
      logger.error({ err, workspaceId }, 'billing: createCheckoutSession failed');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Creates a Stripe Billing Portal session for subscription management.
   */
  async createPortalSession(workspaceId: string): Promise<Result<string>> {
    try {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: workspaceId, deletedAt: null },
      });

      if (!workspace?.stripeCustomerId) {
        return { ok: false, error: new Error('No billing account found') };
      }

      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

      const session = await this.stripe['billingPortal'].sessions.create({
        customer: workspace.stripeCustomerId,
        return_url: `${appUrl}/settings/billing`,
      }) as { url: string };

      return { ok: true, value: session.url };
    } catch (err) {
      logger.error({ err, workspaceId }, 'billing: createPortalSession failed');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Handles checkout.session.completed — activates subscription and sets plan.
   */
  async handleSubscriptionCreated(event: StripeEventBase): Promise<void> {
    const session = event.data.object as unknown as CheckoutSession;
    const workspaceId = session.metadata?.['workspaceId'];

    if (!workspaceId) {
      logger.warn({ eventId: event.id }, 'billing: subscription.created missing workspaceId');
      return;
    }

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as { id: string } | undefined)?.id;

    let plan = 'SOLO';

    if (subscriptionId) {
      const subscription = await this.stripe['subscriptions'].retrieve(subscriptionId) as StripeSubscription;
      const priceId = subscription.items.data[0]?.price?.id ?? '';
      plan = getPlanFromPriceId(priceId);
    }

    await this.prisma.workspace.updateMany({
      where: { id: workspaceId },
      data: {
        plan: plan as 'SOLO' | 'BROKERAGE' | 'ENTERPRISE',
        status: 'ACTIVE',
        stripeSubscriptionId: subscriptionId ?? null,
      },
    });

    await queues.auditLog.add('subscription-created', {
      workspaceId,
      action: 'subscription.created',
      resource: 'workspace',
      resourceId: workspaceId,
      newValue: { plan, status: 'ACTIVE' },
    }).catch(() => undefined);

    logger.info({ workspaceId, plan }, 'billing: subscription activated');
  }

  /**
   * Handles customer.subscription.deleted — cancels workspace.
   */
  async handleSubscriptionDeleted(event: StripeEventBase): Promise<void> {
    const subscription = event.data.object as unknown as StripeSubscription;
    const workspaceId = subscription.metadata?.['workspaceId'];

    if (!workspaceId) {
      logger.warn({ eventId: event.id }, 'billing: subscription.deleted missing workspaceId');
      return;
    }

    await this.prisma.workspace.updateMany({
      where: { id: workspaceId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await queues.notification.add('ops-alert', {
      type: 'OPS_ALERT',
      workspaceId,
      message: `Subscription cancelled for workspace ${workspaceId}`,
    }).catch(() => undefined);

    logger.info({ workspaceId }, 'billing: subscription cancelled');
  }

  /**
   * Handles customer.subscription.updated — updates plan if price changed.
   */
  async handleSubscriptionUpdated(event: StripeEventBase): Promise<void> {
    const subscription = event.data.object as unknown as StripeSubscription;
    const workspaceId = subscription.metadata?.['workspaceId'];

    if (!workspaceId) return;

    const priceId = subscription.items.data[0]?.price?.id ?? '';
    const plan = getPlanFromPriceId(priceId);

    await this.prisma.workspace.updateMany({
      where: { id: workspaceId },
      data: { plan: plan as 'SOLO' | 'BROKERAGE' | 'ENTERPRISE' },
    });

    logger.info({ workspaceId, plan }, 'billing: subscription plan updated');
  }

  /**
   * Handles invoice.payment_failed — suspends workspace.
   */
  async handlePaymentFailed(event: StripeEventBase): Promise<void> {
    const invoice = event.data.object as unknown as StripeInvoice;
    const customer = invoice.customer;
    const customerId = typeof customer === 'string' ? customer : (customer as { id?: string } | undefined)?.id;

    if (!customerId) return;

    const workspace = await this.prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId, deletedAt: null },
    });

    if (!workspace) return;

    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: 'SUSPENDED' },
    });

    await queues.notification.add('ops-alert', {
      type: 'OPS_ALERT',
      workspaceId: workspace.id,
      message: `Payment failed for workspace ${workspace.id} (${workspace.ownerEmail})`,
    }).catch(() => undefined);

    logger.warn({ workspaceId: workspace.id }, 'billing: workspace suspended due to payment failure');
  }

  /**
   * Constructs and verifies a Stripe webhook event from raw body + signature.
   */
  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): StripeEventBase {
    return this.stripe['webhooks'].constructEvent(rawBody, signature, secret) as StripeEventBase;
  }

  /**
   * Returns current month token usage and plan quota.
   */
  async getUsage(workspaceId: string): Promise<Result<{ used: number; quota: number; percent: number }>> {
    try {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: workspaceId, deletedAt: null },
      });

      if (!workspace) {
        return { ok: false, error: new Error('Workspace not found') };
      }

      const used = workspace.tokenUsageCurrentMonth;
      const quota = workspace.tokenQuotaMonthly;
      const percent = quota > 0 ? Math.round((used / quota) * 100) : 0;

      return { ok: true, value: { used, quota, percent } };
    } catch (err) {
      logger.error({ err, workspaceId }, 'billing: getUsage failed');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
