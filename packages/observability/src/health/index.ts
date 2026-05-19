import { PrismaClient, OperationalMetric } from '@conversionops/db';
import { logger } from '../logger';

export interface PlatformHealthSummary {
  status: 'healthy' | 'degraded' | 'down';
  aiP50Ms: number;
  aiP95Ms: number;
  twilioP95Ms: number;
  worstQueueLag: number;
  crmSuccessRate: number;
  checkedAt: Date;
}

export class HealthCollector {
  /**
   * Records AI response latency as an OperationalMetric.
   */
  static async recordAILatency(
    workspaceId: string,
    latencyMs: number,
    prisma: PrismaClient,
  ): Promise<void> {
    try {
      await prisma.operationalMetric.create({
        data: { metric: 'ai.response.latency', value: latencyMs, unit: 'ms', workspaceId },
      });
    } catch (err) {
      logger.warn({ err, workspaceId }, 'health: failed to record AI latency');
    }
  }

  /**
   * Records Twilio SMS send latency.
   */
  static async recordTwilioLatency(
    workspaceId: string,
    latencyMs: number,
    prisma: PrismaClient,
  ): Promise<void> {
    try {
      await prisma.operationalMetric.create({
        data: { metric: 'twilio.sms.latency', value: latencyMs, unit: 'ms', workspaceId },
      });
    } catch (err) {
      logger.warn({ err, workspaceId }, 'health: failed to record Twilio latency');
    }
  }

  /**
   * Records CRM sync outcome (success or failure) per CRM type.
   */
  static async recordCRMSyncResult(
    workspaceId: string,
    success: boolean,
    crm: string,
    prisma: PrismaClient,
  ): Promise<void> {
    try {
      await prisma.operationalMetric.create({
        data: {
          metric: `crm.sync.${crm}.${success ? 'success' : 'failure'}`,
          value: 1,
          unit: 'count',
          workspaceId,
        },
      });
    } catch (err) {
      logger.warn({ err, workspaceId, crm }, 'health: failed to record CRM sync result');
    }
  }

  /**
   * Records queue lag (platform-wide — no workspaceId).
   */
  static async recordQueueLag(
    queueName: string,
    lagCount: number,
    prisma: PrismaClient,
  ): Promise<void> {
    try {
      await prisma.operationalMetric.create({
        data: { metric: `queue.${queueName}.lag`, value: lagCount, unit: 'count', workspaceId: null },
      });
    } catch (err) {
      logger.warn({ err, queueName }, 'health: failed to record queue lag');
    }
  }

  /**
   * Derives platform health from OperationalMetric records in the last hour.
   * Uses JS sort for percentiles — dataset is small (< 1h window).
   */
  static async getPlatformHealth(prisma: PrismaClient): Promise<PlatformHealthSummary> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const metrics: OperationalMetric[] = await prisma.operationalMetric.findMany({
      where: { recordedAt: { gte: oneHourAgo }, deletedAt: null },
    });

    const aiLatencies = metrics
      .filter((m: OperationalMetric) => m.metric === 'ai.response.latency')
      .map((m: OperationalMetric) => m.value)
      .sort((a: number, b: number) => a - b);

    const twilioLatencies = metrics
      .filter((m: OperationalMetric) => m.metric === 'twilio.sms.latency')
      .map((m: OperationalMetric) => m.value)
      .sort((a: number, b: number) => a - b);

    const queueMetrics = metrics.filter((m: OperationalMetric) => m.metric.startsWith('queue.') && m.metric.endsWith('.lag'));
    const queueLagByName = new Map<string, number>();
    for (const m of queueMetrics) {
      const existing = queueLagByName.get(m.metric) ?? 0;
      if (m.value > existing) queueLagByName.set(m.metric, m.value);
    }
    const worstQueueLag = queueLagByName.size > 0
      ? Math.max(...queueLagByName.values())
      : 0;

    const crmSuccess = metrics.filter((m: OperationalMetric) => m.metric.includes('.success')).length;
    const crmFailure = metrics.filter((m: OperationalMetric) => m.metric.includes('.failure')).length;
    const crmTotal = crmSuccess + crmFailure;
    const crmSuccessRate = crmTotal > 0 ? Math.round((crmSuccess / crmTotal) * 10000) / 100 : 100;

    const aiP50 = percentile(aiLatencies, 0.5);
    const aiP95 = percentile(aiLatencies, 0.95);
    const twilioP95 = percentile(twilioLatencies, 0.95);

    let status: 'healthy' | 'degraded' | 'down';
    if (aiP95 > 10000 || worstQueueLag > 500) {
      status = 'down';
    } else if (aiP95 > 5000 || worstQueueLag > 100) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      aiP50Ms: Math.round(aiP50),
      aiP95Ms: Math.round(aiP95),
      twilioP95Ms: Math.round(twilioP95),
      worstQueueLag,
      crmSuccessRate,
      checkedAt: new Date(),
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}
