import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BillingService } from './billing.service';

const CheckoutSchema = z.object({
  priceId: z.string().min(1),
});

type CheckoutDto = z.infer<typeof CheckoutSchema>;

@Controller('billing')
@UseGuards(AuthGuard, RbacGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('billing:write')
  async createCheckout(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(CheckoutSchema)) body: CheckoutDto,
  ) {
    const result = await this.billingService.createCheckoutSession(workspace.id, body.priceId);
    if (!result.ok) throw new InternalServerErrorException('Failed to create checkout session');
    return { url: result.value };
  }

  @Post('portal')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('billing:read')
  async createPortal(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    const result = await this.billingService.createPortalSession(workspace.id);
    if (!result.ok) throw new NotFoundException('No billing account found');
    return { url: result.value };
  }

  @Get('usage')
  @RequirePermission('billing:read')
  async getUsage(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    const result = await this.billingService.getUsage(workspace.id);
    if (!result.ok) throw new InternalServerErrorException('Failed to load usage data');
    return result.value;
  }

  @Get('status')
  @RequirePermission('billing:read')
  async getBillingStatus(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    try {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: workspace.id },
        select: { plan: true, status: true, trialEndsAt: true, stripeSubscriptionId: true },
      });
      if (!ws) throw new NotFoundException('Workspace not found');
      return {
        plan: ws.plan,
        status: ws.stripeSubscriptionId ? ws.status : 'NO_BILLING',
        trialEndsAt: ws.trialEndsAt?.toISOString() ?? null,
        stripeConfigured: this.billingService.isStripeConfigured(),
      };
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      return { plan: 'SOLO', status: 'NO_BILLING', trialEndsAt: null, stripeConfigured: false };
    }
  }
}
