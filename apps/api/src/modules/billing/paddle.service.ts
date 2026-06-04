import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { logger } from '@conversionops/observability';
import { PrismaService } from '../prisma/prisma.service';

export interface PaddleWebhookPayload {
  event_id: string;
  event_type: string;
  data: {
    id: string;
    customer_id: string;
    status: string;
    custom_data?: { workspaceId?: string };
    items?: Array<{
      price: { id: string };
      quantity: number;
    }>;
  };
}

@Injectable()
export class PaddleService {
  constructor(private readonly prisma: PrismaService) {}

  getPaddlePriceIds() {
    return {
      solo:       process.env['PADDLE_SOLO_PRICE_ID'],
      brokerage:  process.env['PADDLE_BROKERAGE_PRICE_ID'],
      enterprise: process.env['PADDLE_ENTERPRISE_PRICE_ID'],
    };
  }

  isConfigured(): boolean {
    return !!process.env['PADDLE_SOLO_PRICE_ID'];
  }

  verifyPaddleWebhook(rawBody: string, signatureHeader: string): boolean {
    const secret = process.env['PADDLE_WEBHOOK_SECRET'];
    if (!secret) {
      logger.warn({}, 'PADDLE_WEBHOOK_SECRET not set — rejecting webhook');
      return false;
    }

    try {
      // Paddle-Signature format: ts=<timestamp>;h1=<hmac>
      const parts = Object.fromEntries(
        signatureHeader.split(';').map(s => s.split('=') as [string, string]),
      );
      const ts = parts['ts'];
      const h1 = parts['h1'];
      if (!ts || !h1) return false;

      const signed = `${ts}:${rawBody}`;
      const expected = createHmac('sha256', secret).update(signed).digest('hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      const receivedBuf = Buffer.from(h1, 'hex');
      if (expectedBuf.length !== receivedBuf.length) return false;
      return timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  private resolvePlan(priceId: string): 'SOLO' | 'BROKERAGE' | 'ENTERPRISE' {
    const ids = this.getPaddlePriceIds();
    if (priceId === ids.solo) return 'SOLO';
    if (priceId === ids.brokerage) return 'BROKERAGE';
    if (priceId === ids.enterprise) return 'ENTERPRISE';
    return 'SOLO';
  }

  async handleSubscriptionActivated(payload: PaddleWebhookPayload): Promise<void> {
    const workspaceId = payload.data.custom_data?.workspaceId;
    if (!workspaceId) {
      logger.warn({ eventId: payload.event_id }, 'paddle: no workspaceId in custom_data');
      return;
    }

    const priceId = payload.data.items?.[0]?.price?.id;
    const plan = priceId ? this.resolvePlan(priceId) : 'SOLO';
    // Reuse stripeCustomerId column for Paddle customer ID
    const customerId = payload.data.customer_id;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan,
        status: 'ACTIVE',
        stripeCustomerId: customerId,
        stripeSubscriptionId: payload.data.id,
      },
    });

    logger.info({ workspaceId, plan, customerId }, 'paddle: subscription activated');
  }

  async handleSubscriptionCancelled(payload: PaddleWebhookPayload): Promise<void> {
    const customerId = payload.data.customer_id;
    const workspace = await this.prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!workspace) {
      logger.warn({ customerId }, 'paddle: no workspace found for customer');
      return;
    }

    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    logger.info({ workspaceId: workspace.id, customerId }, 'paddle: subscription cancelled');
  }

  async handleSubscriptionUpdated(payload: PaddleWebhookPayload): Promise<void> {
    const customerId = payload.data.customer_id;
    const workspace = await this.prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!workspace) return;

    const priceId = payload.data.items?.[0]?.price?.id;
    if (!priceId) return;
    const plan = this.resolvePlan(priceId);

    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { plan, status: payload.data.status === 'active' ? 'ACTIVE' : workspace.status },
    });

    logger.info({ workspaceId: workspace.id, plan }, 'paddle: subscription updated');
  }
}
