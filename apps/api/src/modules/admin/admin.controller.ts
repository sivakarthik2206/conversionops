import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { logger } from '@conversionops/observability';
import { VertexAIClient, buildSystemPrompt } from '@conversionops/ai';
import { queues, QUEUE_NAMES } from '@conversionops/orchestration';

@Controller('admin')
@Public()
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all workspaces with basic stats. */
  @Get('workspaces')
  async listWorkspaces(
    @Query('limit') limitStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limit = limitStr ? Math.min(parseInt(limitStr, 10), 100) : 50;
    const workspaces = await this.prisma.workspace.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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

    const hasMore = workspaces.length > limit;
    const items = hasMore ? workspaces.slice(0, -1) : workspaces;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items: items.map((ws) => ({
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
      })),
      nextCursor,
    };
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

  /** Returns audit log entries across all workspaces with optional filters. */
  @Get('audit-logs')
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limitStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '50', 10), 200);
    const entries = await this.prisma.auditLog.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: {
        deletedAt: null,
        ...(action ? { action } : {}),
        ...(resource ? { resource } : {}),
        ...(workspaceId ? { workspaceId } : {}),
      },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });

    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, -1) : entries;
    return { items, nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null, total: items.length };
  }

  /** Returns BullMQ queue counts for all queues (waiting, active, completed, failed, delayed). */
  @Get('queues')
  async getQueueStats() {
    const queueEntries = Object.entries(queues) as [string, (typeof queues)[keyof typeof queues]][];
    const stats = await Promise.all(
      queueEntries.map(async ([key, q]) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          q.getWaitingCount().catch(() => 0),
          q.getActiveCount().catch(() => 0),
          q.getCompletedCount().catch(() => 0),
          q.getFailedCount().catch(() => 0),
          q.getDelayedCount().catch(() => 0),
        ]);
        return { name: q.name, key, waiting, active, completed, failed, delayed };
      }),
    );
    return { queues: stats };
  }

  /** Returns failed jobs for a single queue (DLQ view). */
  @Get('queues/:name/failed')
  async getFailedJobs(
    @Param('name') name: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '20', 10), 100);
    const q = Object.values(queues).find(q => q.name === name);
    if (!q) throw new NotFoundException(`Queue "${name}" not found`);
    const jobs = await q.getFailed(0, limit - 1).catch(() => []);
    return {
      jobs: jobs.map(j => ({
        id: j.id,
        name: j.name,
        data: j.data,
        failedReason: j.failedReason,
        attemptsMade: j.attemptsMade,
        processedOn: j.processedOn,
        timestamp: j.timestamp,
      })),
    };
  }

  /** Retries a single failed job — moves it back to waiting state. */
  @Post('queues/:name/failed/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  async retryFailedJob(
    @Param('name') name: string,
    @Param('jobId') jobId: string,
  ) {
    const q = Object.values(queues).find(q => q.name === name);
    if (!q) throw new NotFoundException(`Queue "${name}" not found`);

    const jobs = await q.getFailed(0, 1000).catch(() => []);
    const job = jobs.find(j => j.id === jobId);
    if (!job) throw new NotFoundException(`Job "${jobId}" not found in failed queue`);

    await job.retry();
    logger.info({ queue: name, jobId }, 'admin: DLQ job retried');
    return { ok: true, jobId, queue: name };
  }

  /** Retries ALL failed jobs in a queue (bulk retry). */
  @Post('queues/:name/failed/retry-all')
  @HttpCode(HttpStatus.OK)
  async retryAllFailedJobs(@Param('name') name: string) {
    const q = Object.values(queues).find(q => q.name === name);
    if (!q) throw new NotFoundException(`Queue "${name}" not found`);

    const jobs = await q.getFailed(0, 1000).catch(() => []);
    await Promise.allSettled(jobs.map(j => j.retry()));
    logger.info({ queue: name, count: jobs.length }, 'admin: DLQ bulk retry');
    return { ok: true, retried: jobs.length, queue: name };
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
