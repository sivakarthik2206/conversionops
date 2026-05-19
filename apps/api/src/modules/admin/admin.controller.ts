import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { logger } from '@conversionops/observability';
import { VertexAIClient, buildSystemPrompt } from '@conversionops/ai';

@Controller('admin')
@Public()
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all workspaces with basic stats. */
  @Get('workspaces')
  async listWorkspaces() {
    const workspaces = await this.prisma.workspace.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            leads: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      plan: ws.plan,
      status: ws.status,
      ownerEmail: ws.ownerEmail,
      agentCount: ws._count.users,
      totalLeads: ws._count.leads,
      tokenUsageCurrentMonth: ws.tokenUsageCurrentMonth,
      tokenQuotaMonthly: ws.tokenQuotaMonthly,
      createdAt: ws.createdAt,
    }));
  }

  /** Returns a single workspace with full config. */
  @Get('workspaces/:id')
  async getWorkspace(@Param('id') id: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, deletedAt: null },
      include: {
        users: {
          where: { isActive: true },
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  /** Suspends a workspace. */
  @Post('workspaces/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendWorkspace(@Param('id') id: string) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id, deletedAt: null } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    await this.prisma.workspace.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    logger.info({ workspaceId: id }, 'admin: workspace suspended');
    return { ok: true };
  }

  /** Reactivates a suspended workspace. */
  @Post('workspaces/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateWorkspace(@Param('id') id: string) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id, deletedAt: null } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    await this.prisma.workspace.update({
      where: { id },
      data: { status: 'ACTIVE', cancelledAt: null },
    });

    logger.info({ workspaceId: id }, 'admin: workspace reactivated');
    return { ok: true };
  }

  /** Returns full lead audit trail: events, workflow executions, AI messages with eval scores. */
  @Get('leads/:id/trace')
  async getLeadTrace(@Param('id') id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        conversations: {
          include: {
            messages: {
              where: { deletedAt: null },
              include: { evalResults: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead not found');

    const leadEvents = await this.prisma.leadEvent.findMany({
      where: { leadId: id },
      orderBy: { sequence: 'asc' },
    });

    const workflowExecutions = await this.prisma.workflowExecution.findMany({
      where: { leadId: id },
      orderBy: { startedAt: 'asc' },
    });

    return { lead, leadEvents, workflowExecutions };
  }

  /**
   * Runs a qualification prompt against workspace config and returns response + eval scores.
   * Accepts a workspaceId and message list for simulation.
   */
  @Post('ai/debug')
  @HttpCode(HttpStatus.OK)
  async debugAI(@Body() body: { workspaceId: string; messages: string[] }) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: body.workspaceId, deletedAt: null },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    const vertexClient = new VertexAIClient();

    const systemPrompt = buildSystemPrompt(workspace);
    const userMessages = (body.messages ?? []).join('\n');

    const startMs = Date.now();

    const response = await vertexClient.generate(
      systemPrompt,
      userMessages || 'Hello, I am interested in buying a home.',
    );

    const latencyMs = Date.now() - startMs;

    return {
      ok: response.ok,
      content: response.ok ? response.value.content : null,
      error: response.ok ? null : response.error?.message,
      inputTokens: response.ok ? response.value.inputTokens : 0,
      outputTokens: response.ok ? response.value.outputTokens : 0,
      latencyMs,
      systemPromptLength: systemPrompt.length,
    };
  }
}
