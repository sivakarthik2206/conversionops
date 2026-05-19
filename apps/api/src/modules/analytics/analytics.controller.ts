import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { GetFunnelHandler } from './queries/get-funnel.handler';
import { GetResponseTimesHandler } from './queries/get-response-times.handler';
import { GetSourceBreakdownHandler } from './queries/get-source-breakdown.handler';

function parseDateParam(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

@Controller('analytics')
@UseGuards(AuthGuard, RbacGuard)
export class AnalyticsController {
  constructor(
    private readonly getFunnelHandler: GetFunnelHandler,
    private readonly getResponseTimesHandler: GetResponseTimesHandler,
    private readonly getSourceBreakdownHandler: GetSourceBreakdownHandler,
  ) {}

  @Get('funnel')
  @RequirePermission('analytics:read')
  async getFunnel(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
    @Query('agentId') agentId?: string,
  ) {
    const to = parseDateParam(toStr, new Date());
    const from = parseDateParam(fromStr, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const result = await this.getFunnelHandler.execute({
      workspaceId: workspace.id,
      from,
      to,
      agentId,
    });
    if (!result.ok) throw new InternalServerErrorException('Failed to load funnel data');
    return result.value;
  }

  @Get('response-times')
  @RequirePermission('analytics:read')
  async getResponseTimes(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const to = parseDateParam(toStr, new Date());
    const from = parseDateParam(fromStr, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const result = await this.getResponseTimesHandler.execute({
      workspaceId: workspace.id,
      from,
      to,
    });
    if (!result.ok) throw new InternalServerErrorException('Failed to load response time data');
    return result.value;
  }

  @Get('lead-sources')
  @RequirePermission('analytics:read')
  async getLeadSources(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const to = parseDateParam(toStr, new Date());
    const from = parseDateParam(fromStr, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const result = await this.getSourceBreakdownHandler.execute({
      workspaceId: workspace.id,
      from,
      to,
    });
    if (!result.ok) throw new InternalServerErrorException('Failed to load source breakdown data');
    return result.value;
  }
}
