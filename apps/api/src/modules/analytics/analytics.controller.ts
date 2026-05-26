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
import { PrismaService } from '../prisma/prisma.service';

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
    private readonly prisma: PrismaService,
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

  @Get('agents')
  @RequirePermission('analytics:read')
  async getAgentPerformance(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const to = parseDateParam(toStr, new Date());
    const from = parseDateParam(fromStr, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const agents = await this.prisma.workspaceUser.findMany({
      where: { workspaceId: workspace.id, isActive: true, deletedAt: null },
      select: {
        id: true,
        displayName: true,
        role: true,
        isAvailable: true,
        totalLeadsAssigned: true,
        totalConversions: true,
        conversionRate: true,
        avgResponseTimeMs: true,
        specializations: true,
        languages: true,
        serviceAreas: true,
        user: { select: { email: true, name: true, avatarUrl: true } },
      },
    });

    // Fetch period-specific lead stats per agent separately
    const periodLeadCounts = await Promise.all(
      agents.map(async (a) => {
        const leads = await this.prisma.lead.findMany({
          where: {
            workspaceId: workspace.id,
            assignedWorkspaceUserId: a.id,
            createdAt: { gte: from, lte: to },
            deletedAt: null,
          },
          select: { status: true, score: true },
        });
        return {
          agentId: a.id,
          periodLeads: leads.length,
          periodConverted: leads.filter(l => l.status === 'CONVERTED' || l.status === 'APPOINTMENT_SCHEDULED').length,
          avgScore: leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0,
        };
      }),
    );

    const periodMap = new Map(periodLeadCounts.map(p => [p.agentId, p]));

    return {
      agents: agents.map(a => {
        const period = periodMap.get(a.id);
        return {
          id: a.id,
          displayName: a.displayName,
          role: a.role,
          isAvailable: a.isAvailable,
          totalLeadsAssigned: a.totalLeadsAssigned,
          totalConversions: a.totalConversions,
          conversionRate: a.conversionRate,
          avgResponseTimeMs: a.avgResponseTimeMs,
          specializations: a.specializations,
          languages: a.languages,
          serviceAreas: a.serviceAreas,
          user: a.user,
          period: {
            from: from.toISOString(),
            to: to.toISOString(),
            leads: period?.periodLeads ?? 0,
            converted: period?.periodConverted ?? 0,
            avgScore: period?.avgScore ?? 0,
          },
        };
      }),
    };
  }

  @Get('trends')
  @RequirePermission('analytics:read')
  async getTrends(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const to = parseDateParam(toStr, new Date());
    const from = parseDateParam(fromStr, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);

    // Build the ordered list of day buckets across the range
    const buckets = new Map<string, { date: string; leads: number; appointments: number; conversions: number }>();
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(0, 0, 0, 0);
    while (cursor <= end) {
      const key = dayKey(cursor);
      buckets.set(key, { date: key, leads: 0, appointments: 0, conversions: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const [leads, appointments] = await Promise.all([
      this.prisma.lead.findMany({
        where: { workspaceId: workspace.id, createdAt: { gte: from, lte: to }, deletedAt: null },
        select: { createdAt: true, status: true, updatedAt: true },
      }),
      this.prisma.appointment.findMany({
        where: { workspaceId: workspace.id, createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
      }),
    ]);

    for (const l of leads) {
      const b = buckets.get(dayKey(l.createdAt));
      if (b) b.leads += 1;
      if (l.status === 'CONVERTED') {
        const cb = buckets.get(dayKey(l.updatedAt));
        if (cb) cb.conversions += 1;
      }
    }
    for (const a of appointments) {
      const b = buckets.get(dayKey(a.createdAt));
      if (b) b.appointments += 1;
    }

    const days = Array.from(buckets.values());
    const totals = days.reduce(
      (acc, d) => ({ leads: acc.leads + d.leads, appointments: acc.appointments + d.appointments, conversions: acc.conversions + d.conversions }),
      { leads: 0, appointments: 0, conversions: 0 },
    );

    return { days, totals, from: from.toISOString(), to: to.toISOString() };
  }
}
