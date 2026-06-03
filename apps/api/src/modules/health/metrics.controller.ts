import { Controller, Get, Header, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { redisConnection } from '@conversionops/orchestration';
import { HealthCollector } from '@conversionops/observability';
import { Public } from '../../common/decorators/public.decorator';
import { AdminGuard } from '../admin/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prometheus-compatible metrics endpoint.
 * Protected by AdminGuard (x-admin-api-key header required).
 * This prevents scraping of capacity/health data by external parties.
 */
@Controller('metrics')
@Public()
@UseGuards(AdminGuard)
export class MetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(@Res() res: Response): Promise<void> {
    const [health, redisInfo, processMetrics] = await Promise.all([
      this.getPlatformHealth(),
      this.getRedisMetrics(),
      Promise.resolve(this.getProcessMetrics()),
    ]);

    const lines: string[] = [
      '# HELP conversionops_platform_healthy Platform overall health (1=healthy, 0=degraded, -1=down)',
      '# TYPE conversionops_platform_healthy gauge',
      `conversionops_platform_healthy ${health.statusScore}`,

      '# HELP conversionops_ai_latency_p50_ms AI response latency P50 in milliseconds',
      '# TYPE conversionops_ai_latency_p50_ms gauge',
      `conversionops_ai_latency_p50_ms ${health.aiP50Ms}`,

      '# HELP conversionops_ai_latency_p95_ms AI response latency P95 in milliseconds',
      '# TYPE conversionops_ai_latency_p95_ms gauge',
      `conversionops_ai_latency_p95_ms ${health.aiP95Ms}`,

      '# HELP conversionops_sms_latency_p95_ms Twilio SMS send latency P95 in milliseconds',
      '# TYPE conversionops_sms_latency_p95_ms gauge',
      `conversionops_sms_latency_p95_ms ${health.twilioP95Ms}`,

      '# HELP conversionops_queue_lag_worst Worst queue backlog across all queues',
      '# TYPE conversionops_queue_lag_worst gauge',
      `conversionops_queue_lag_worst ${health.worstQueueLag}`,

      '# HELP conversionops_crm_sync_success_rate CRM sync success rate (0-100)',
      '# TYPE conversionops_crm_sync_success_rate gauge',
      `conversionops_crm_sync_success_rate ${health.crmSuccessRate}`,

      '# HELP conversionops_redis_connected Redis connectivity (1=connected, 0=disconnected)',
      '# TYPE conversionops_redis_connected gauge',
      `conversionops_redis_connected ${redisInfo.connected ? 1 : 0}`,

      '# HELP conversionops_process_uptime_seconds Node.js process uptime in seconds',
      '# TYPE conversionops_process_uptime_seconds counter',
      `conversionops_process_uptime_seconds ${processMetrics.uptimeSeconds}`,

      '# HELP conversionops_process_heap_used_bytes V8 heap used bytes',
      '# TYPE conversionops_process_heap_used_bytes gauge',
      `conversionops_process_heap_used_bytes ${processMetrics.heapUsedBytes}`,

      '# HELP conversionops_process_heap_total_bytes V8 heap total bytes',
      '# TYPE conversionops_process_heap_total_bytes gauge',
      `conversionops_process_heap_total_bytes ${processMetrics.heapTotalBytes}`,

      '# HELP conversionops_process_rss_bytes Resident set size bytes',
      '# TYPE conversionops_process_rss_bytes gauge',
      `conversionops_process_rss_bytes ${processMetrics.rssBytes}`,

      '# HELP conversionops_active_workspaces Total non-deleted workspaces',
      '# TYPE conversionops_active_workspaces gauge',
      `conversionops_active_workspaces ${health.activeWorkspaces}`,

      '# HELP conversionops_leads_today_total Leads created today',
      '# TYPE conversionops_leads_today_total counter',
      `conversionops_leads_today_total ${health.leadsToday}`,

      '',
    ];

    res.status(200).send(lines.join('\n'));
  }

  private async getPlatformHealth(): Promise<{
    statusScore: number;
    aiP50Ms: number;
    aiP95Ms: number;
    twilioP95Ms: number;
    worstQueueLag: number;
    crmSuccessRate: number;
    activeWorkspaces: number;
    leadsToday: number;
  }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [summary, activeWorkspaces, leadsToday] = await Promise.all([
      HealthCollector.getPlatformHealth(this.prisma).catch(() => null),
      this.prisma.workspace.count({ where: { deletedAt: null, status: 'ACTIVE' } }).catch(() => 0),
      this.prisma.lead.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
    ]);

    const statusScore = !summary ? 0
      : summary.status === 'healthy' ? 1
      : summary.status === 'degraded' ? 0
      : -1;

    return {
      statusScore,
      aiP50Ms: summary?.aiP50Ms ?? 0,
      aiP95Ms: summary?.aiP95Ms ?? 0,
      twilioP95Ms: summary?.twilioP95Ms ?? 0,
      worstQueueLag: summary?.worstQueueLag ?? 0,
      crmSuccessRate: summary?.crmSuccessRate ?? 100,
      activeWorkspaces,
      leadsToday,
    };
  }

  private async getRedisMetrics(): Promise<{ connected: boolean }> {
    try {
      const result = await redisConnection.ping();
      return { connected: result === 'PONG' };
    } catch {
      return { connected: false };
    }
  }

  private getProcessMetrics(): {
    uptimeSeconds: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
    rssBytes: number;
  } {
    const mem = process.memoryUsage();
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      rssBytes: mem.rss,
    };
  }
}
