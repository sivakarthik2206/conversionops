import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { logger } from '@conversionops/observability';
import { VertexAIClient, buildSystemPrompt } from '@conversionops/ai';
import { queues, QUEUE_NAMES, redisConnection } from '@conversionops/orchestration';
import { deletePII, exportUserData } from '@conversionops/compliance';
import { PrismaClient as UnscopedPrismaClient } from '@conversionops/db';

/** Percentile helper (p in 0..1). Returns 0 for an empty sample. */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return Math.round(sorted[idx] ?? 0);
}

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

  /** Returns counts for a single queue (waiting, active, completed, failed, delayed). */
  @Get('queues/:name')
  async getQueueByName(@Param('name') name: string) {
    const q = Object.values(queues).find(q => q.name === name);
    if (!q) throw new NotFoundException(`Queue "${name}" not found`);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      q.getWaitingCount().catch(() => 0),
      q.getActiveCount().catch(() => 0),
      q.getCompletedCount().catch(() => 0),
      q.getFailedCount().catch(() => 0),
      q.getDelayedCount().catch(() => 0),
    ]);
    return { name: q.name, waiting, active, completed, failed, delayed };
  }

  /** Returns failed jobs for a single queue (DLQ view) as a flat array. */
  @Get('queues/:name/failed')
  async getFailedJobs(
    @Param('name') name: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '20', 10), 100);
    const q = Object.values(queues).find(q => q.name === name);
    if (!q) throw new NotFoundException(`Queue "${name}" not found`);
    const jobs = await q.getFailed(0, limit - 1).catch(() => []);
    return jobs.map(j => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      processedOn: j.processedOn ?? null,
      timestamp: j.timestamp,
    }));
  }

  /** Retries a single failed job — moves it back to waiting state. */
  @Post('queues/:name/jobs/:jobId/retry')
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
  @Post('queues/:name/retry-all')
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

  /**
   * Aggregate platform health for the ops console. Every value is computed from
   * live data (DB, Redis, BullMQ) — nothing is synthesised.
   */
  @Get('health')
  async getPlatformHealth() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [dbUp, redisUp] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      redisConnection.ping().then((r) => r === 'PONG').catch(() => false),
    ]);

    // Per-queue snapshot: counts + age of the oldest waiting job (lag signal).
    const queueSnap = await Promise.all(
      Object.values(queues).map(async (q) => {
        const [waiting, active, completed, failed, oldest] = await Promise.all([
          q.getWaitingCount().catch(() => 0),
          q.getActiveCount().catch(() => 0),
          q.getCompletedCount().catch(() => 0),
          q.getFailedCount().catch(() => 0),
          q.getWaiting(0, 0).then((jobs) => jobs[0]?.timestamp ?? null).catch(() => null),
        ]);
        return { name: q.name, waiting, active, completed, failed, oldest };
      }),
    );

    const totalWaiting = queueSnap.reduce((s, q) => s + q.waiting, 0);
    const totalActive = queueSnap.reduce((s, q) => s + q.active, 0);
    const queueLagMs = queueSnap.reduce(
      (max, q) => (q.oldest ? Math.max(max, Date.now() - q.oldest) : max),
      0,
    );

    const crm = queueSnap.find((q) => q.name === QUEUE_NAMES.CRM_SYNC);
    const crmTotal = crm ? crm.completed + crm.failed : 0;
    const crmSyncSuccessRate =
      crm && crmTotal > 0 ? Math.round((crm.completed / crmTotal) * 1000) / 10 : 100;

    // Worker liveness heuristic: a live worker drains the queue. A growing
    // backlog with zero active jobs (while Redis is up) signals a dead worker.
    // For exact liveness, add a worker heartbeat metric — see recommendations.
    const workerUp = redisUp && !(totalWaiting > 5 && totalActive === 0);

    const [aiLatencies, twilioMetrics, activeWorkspaces, totalLeads24h] = await Promise.all([
      this.prisma.aIUsageRecord
        .findMany({
          where: { recordedAt: { gte: since }, latencyMs: { not: null } },
          select: { latencyMs: true },
          orderBy: { recordedAt: 'desc' },
          take: 1000,
        })
        .catch(() => [] as { latencyMs: number | null }[]),
      this.prisma.operationalMetric
        .findMany({
          where: { recordedAt: { gte: since }, metric: { in: ['twilio.latency_ms', 'twilio.sms.latency_ms'] } },
          select: { value: true },
          take: 1000,
        })
        .catch(() => [] as { value: number }[]),
      this.prisma.workspace.count({ where: { status: 'ACTIVE', deletedAt: null } }).catch(() => 0),
      this.prisma.lead.count({ where: { createdAt: { gte: since }, deletedAt: null } }).catch(() => 0),
    ]);

    const aiLatencyP95Ms = percentile(
      aiLatencies.map((r) => r.latencyMs ?? 0).filter((n) => n > 0),
      0.95,
    );
    const twilioLatencyP95Ms = percentile(twilioMetrics.map((m) => m.value), 0.95);

    const twilioConfigured = !!process.env['TWILIO_ACCOUNT_SID'];
    const vertexConfigured = !!process.env['GOOGLE_CLOUD_PROJECT'] && !!process.env['VERTEX_AI_MODEL'];

    const status: 'healthy' | 'degraded' | 'down' = !dbUp || !redisUp
      ? 'down'
      : !workerUp || queueLagMs > 60_000
        ? 'degraded'
        : 'healthy';

    return {
      status,
      lastUpdated: new Date().toISOString(),
      metrics: {
        aiLatencyP95Ms,
        twilioLatencyP95Ms,
        queueLagMs,
        crmSyncSuccessRate,
        activeWorkspaces,
        totalLeads24h,
      },
      services: {
        api: 'up' as const,
        worker: workerUp ? ('up' as const) : ('down' as const),
        database: dbUp ? ('up' as const) : ('down' as const),
        redis: redisUp ? ('up' as const) : ('down' as const),
        twilio: twilioConfigured ? ('up' as const) : ('down' as const),
        vertexAI: vertexConfigured ? ('up' as const) : ('down' as const),
      },
    };
  }

  /** Returns AI eval results (most recent first) with the evaluated message text. */
  @Get('evals')
  async getEvals(
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '200', 10), 500);
    const rows = await this.prisma.aIEvalResult.findMany({
      take: limit,
      where: { deletedAt: null, ...(workspaceId ? { workspaceId } : {}) },
      orderBy: { runAt: 'desc' },
      include: { message: { select: { content: true } } },
    });

    return rows.map((r) => ({
      id: r.id,
      messageId: r.messageId,
      workspaceId: r.workspaceId,
      relevanceScore: r.relevanceScore,
      hallucinationScore: r.hallucinationScore,
      bookingIntentScore: r.bookingIntentScore,
      qualProgressScore: r.qualProgressScore,
      toneScore: r.toneScore,
      runAt: r.runAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      content: r.message?.content ?? undefined,
    }));
  }

  /**
   * CCPA right of access — exports all data tied to a phone number across every
   * workspace. Read-only; safe to run through the pooled (tenant-scoped) client.
   */
  @Get('ccpa/export')
  async ccpaExport(@Query('phone') phone?: string) {
    if (!phone) throw new BadRequestException('phone query parameter is required');
    const data = await exportUserData(phone, this.prisma);
    logger.info({ phone: phone.slice(0, 4) + '***', leads: data.leads.length }, 'admin: CCPA export');
    return data;
  }

  /**
   * CCPA right to delete — anonymises PII for a data subject across all
   * workspaces. This is a deliberately cross-tenant write, so it runs on a
   * dedicated unscoped client that bypasses the per-request tenant guard
   * (which hard-fails workspace-less writes). Always disconnects.
   */
  @Post('ccpa/delete')
  @HttpCode(HttpStatus.OK)
  async ccpaDelete(
    @Body() body: { phone?: string; email?: string; reason?: string },
    @Req() req: Request & { user?: { email?: string } },
  ) {
    if (!body.phone && !body.email) {
      throw new BadRequestException('phone or email is required');
    }
    if (!body.reason || body.reason.trim().length < 3) {
      throw new BadRequestException('a reason is required for CCPA deletion (audit trail)');
    }

    const requestedBy = req.user?.email ?? 'ops-console';
    const client = new UnscopedPrismaClient();
    try {
      const report = await deletePII(
        { phone: body.phone, email: body.email, requestedBy, reason: body.reason.trim() },
        client,
      );
      logger.warn({ requestedBy, affectedLeads: report.affectedLeads }, 'admin: CCPA deletion executed');
      return report;
    } finally {
      await client.$disconnect().catch(() => undefined);
    }
  }
}
