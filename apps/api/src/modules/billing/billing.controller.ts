import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PaddleService } from './paddle.service';

@Controller('billing')
@UseGuards(AuthGuard, RbacGuard)
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paddleService: PaddleService,
  ) {}

  @Get('usage')
  @RequirePermission('billing:read')
  async getUsage(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspace.id },
      select: { tokenUsageCurrentMonth: true, tokenQuotaMonthly: true },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    const used = ws.tokenUsageCurrentMonth;
    const quota = ws.tokenQuotaMonthly;
    return { used, quota, percent: quota > 0 ? Math.round((used / quota) * 100) : 0 };
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('billing:read')
  async getBillingStatus(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    try {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: workspace.id },
        select: { plan: true, status: true, trialEndsAt: true, stripeCustomerId: true },
      });
      if (!ws) throw new NotFoundException('Workspace not found');
      return {
        plan: ws.plan,
        status: ws.status,
        trialEndsAt: ws.trialEndsAt?.toISOString() ?? null,
        paddleConfigured: this.paddleService.isConfigured(),
        paddlePriceIds: this.paddleService.getPaddlePriceIds(),
        customerId: ws.stripeCustomerId ?? null,
      };
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      return {
        plan: 'SOLO',
        status: 'FREE',
        trialEndsAt: null,
        paddleConfigured: false,
        paddlePriceIds: { solo: null, brokerage: null, enterprise: null },
        customerId: null,
      };
    }
  }
}
