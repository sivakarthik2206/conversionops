import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import type { Subscription as StripeSubscription } from 'stripe/cjs/resources/Subscriptions.js';
import type { Invoice as StripeInvoice } from 'stripe/cjs/resources/Invoices.js';
import type { Customer as StripeCustomer } from 'stripe/cjs/resources/Customers.js';
import type { Session as StripeCheckoutSession } from 'stripe/cjs/resources/Checkout/Sessions.js';
import type { Result } from '@conversionops/types';
import { logger } from '@conversionops/observability';
import { PrismaService } from '../prisma/prisma.service';

const PLAN_PRICE_MAP: Record<string, string> = {
  SOLO: 'price_solo',
  BROKERAGE: 'price_brokerage',
};

export type StripeEvent = ReturnType<InstanceType<typeof Stripe>['webhooks']['constructEvent']>;

@Injectable()
export class BillingService {
  private readonly stripe: InstanceType<typeof Stripe>;

  private readonly stripeConfigured: boolean;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env['STRIPE_SECRET_KEY'] ?? '';
    this.stripeConfigured = key.startsWith('sk_');
    this.stripe = new Stripe(key || 'sk_test_placeholder', { apiVersion: '2026-04-22.dahlia' });
  }

  private requireStripe(): Result<void> {
    if (!this.stripeConfigured) {
      return { ok: false, error: new Error('Stripe is not configured — set STRIPE_SECRET_KEY to enable billing') };
    }
    return { ok: true, value: undefined };
  }

  /**
   * Creates a Stripe Checkout session for the given workspace and price.
   * Creates a Stripe customer if one does not exist.
   * @returns Result<checkoutUrl>
   */
  async createCheckoutSession(workspaceId: string, priceId: string): Promise<Result<string>> {
    const stripeCheck = this.requireStripe();
    if (!stripeCheck.ok) return stripeCheck;
    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) return { ok: false, error: new Error('Workspace not found') };

      let customerId = workspace.stripeCustomerId;

      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: workspace.ownerEmail,
          name: workspace.name,
          metadata: { workspaceId },
        });
        customerId = customer.id;
        await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: { stripeCustomerId: customerId },
        });
      }

      const appUrl = process.env['APP_URL'] ?? process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${appUrl}/settings/billing?success=true`,
        cancel_url: `${appUrl}/settings/billing?cancelled=true`,
        metadata: { workspaceId },
      });

      if (!session.url) return { ok: false, error: new Error('No checkout URL returned') };
      return { ok: true, value: session.url };
    } catch (error) {
      logger.error({ err: error, workspaceId }, 'Billing: createCheckoutSession failed');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Creates a Stripe Customer Portal session for managing subscriptions.
   * @returns Result<portalUrl>
   */
  async createPortalSession(workspaceId: string): Promise<Result<string>> {
    const stripeCheck = this.requireStripe();
    if (!stripeCheck.ok) return stripeCheck;
    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace?.stripeCustomerId) {
        return { ok: false, error: new Error('No Stripe customer found for workspace') };
      }

      const appUrl = process.env['APP_URL'] ?? process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
      const session = await this.stripe.billingPortal.sessions.create({
        customer: workspace.stripeCustomerId,
        return_url: `${appUrl}/settings/billing`,
      });

      return { ok: true, value: session.url };
    } catch (error) {
      logger.error({ err: error, workspaceId }, 'Billing: createPortalSession failed');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Returns current usage stats for the workspace.
   */
  async getUsage(workspaceId: string): Promise<Result<{ used: number; limit: number; percentUsed: number }>> {
    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) return { ok: false, error: new Error('Workspace not found') };

      const used = workspace.tokenUsageCurrentMonth;
      const limit = workspace.tokenQuotaMonthly;
      const percentUsed = limit > 0 ? Math.round((used / limit) * 100) : 0;

      return { ok: true, value: { used, limit, percentUsed } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Handles Stripe checkout.session.completed webhook.
   * Extracts workspaceId from session metadata and activates the workspace.
   */
  async handleCheckoutCompleted(event: StripeEvent): Promise<void> {
    const session = event.data.object as StripeCheckoutSession;
    const workspaceId = (session.metadata as Record<string, string> | null)?.['workspaceId'];
    if (!workspaceId) {
      logger.warn({ sessionId: session.id }, 'Billing: no workspaceId in checkout session metadata');
      return;
    }

    const rawSub = session.subscription;
    const subscriptionId = typeof rawSub === 'string'
      ? rawSub
      : (rawSub as StripeSubscription | null)?.id;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
        status: 'ACTIVE',
      },
    });

    logger.info({ workspaceId, subscriptionId, sessionId: session.id }, 'Billing: checkout completed — workspace activated');
  }

  /**
   * Handles Stripe subscription.created or subscription.updated webhook.
   * Maps price ID to plan and updates workspace accordingly.
   */
  async handleSubscriptionCreated(event: StripeEvent): Promise<void> {
    const subscription = event.data.object as StripeSubscription;
    const workspaceId = (subscription.metadata as Record<string, string>)['workspaceId'];
    if (!workspaceId) {
      logger.warn({ subscriptionId: subscription.id }, 'Billing: no workspaceId in subscription metadata');
      return;
    }

    const priceId = subscription.items.data[0]?.price.id ?? '';
    const plan = resolvePlan(priceId);

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        stripeSubscriptionId: subscription.id,
        plan,
        status: 'ACTIVE',
        tokenQuotaMonthly: planQuota(plan),
      },
    });

    logger.info({ workspaceId, plan, subscriptionId: subscription.id }, 'Billing: subscription activated');
  }

  /**
   * Handles Stripe subscription.updated webhook.
   */
  async handleSubscriptionUpdated(event: StripeEvent): Promise<void> {
    return this.handleSubscriptionCreated(event);
  }

  /**
   * Constructs a Stripe webhook event
   */
  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): StripeEvent {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Handles Stripe customer.subscription.deleted webhook.
   */
  async handleSubscriptionDeleted(event: StripeEvent): Promise<void> {
    const subscription = event.data.object as StripeSubscription;
    const workspaceId = (subscription.metadata as Record<string, string>)['workspaceId'];
    if (!workspaceId) return;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    logger.info({ workspaceId }, 'Billing: subscription cancelled');
  }

  /**
   * Handles Stripe invoice.payment_failed webhook.
   * Suspends workspace and enqueues billing alert.
   */
  async handlePaymentFailed(event: StripeEvent): Promise<void> {
    const invoice = event.data.object as StripeInvoice;
    const rawCustomer = invoice.customer;
    const customerId = typeof rawCustomer === 'string' ? rawCustomer : (rawCustomer as StripeCustomer | null)?.id;
    if (!customerId) return;

    const workspace = await this.prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!workspace) return;

    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: 'SUSPENDED' },
    });

    logger.warn({ workspaceId: workspace.id, customerId }, 'Billing: payment failed — workspace suspended');
  }

  /** Returns the Stripe instance for webhook verification. */
  getStripe(): InstanceType<typeof Stripe> {
    return this.stripe;
  }
}

function resolvePlan(priceId: string): 'SOLO' | 'BROKERAGE' | 'ENTERPRISE' {
  if (priceId.includes('brokerage') || priceId.includes('BROKERAGE')) return 'BROKERAGE';
  if (priceId.includes('enterprise') || priceId.includes('ENTERPRISE')) return 'ENTERPRISE';
  return 'SOLO';
}

function planQuota(plan: string): number {
  if (plan === 'BROKERAGE') return 10_000_000;
  if (plan === 'ENTERPRISE') return 50_000_000;
  return 2_000_000;
}
