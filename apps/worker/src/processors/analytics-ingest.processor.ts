import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { HealthCollector } from '@conversionops/observability';
import type { AnalyticsIngestJobData } from '@conversionops/orchestration';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class AnalyticsIngestProcessor {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Routes analytics events to HealthCollector and updates denormalised WorkspaceUser counters.
   * Never throws — all errors are swallowed with logging.
   */
  async process(job: Job<AnalyticsIngestJobData>): Promise<void> {
    const { workspaceId, event, leadId, metadata } = job.data;

    try {
      await this.route(workspaceId, event, leadId, metadata);
    } catch (err) {
      logger.error({ err, jobId: job.id, event, workspaceId }, 'analytics-ingest: unhandled error');
    }
  }

  private async route(
    workspaceId: string,
    event: string,
    leadId: string | undefined,
    metadata: Record<string, unknown> | undefined,
  ): Promise<void> {
    switch (event) {
      case 'ai.response.latency': {
        const latencyMs = Number(metadata?.latencyMs ?? 0);
        await HealthCollector.recordAILatency(workspaceId, latencyMs, this.prisma);
        await this.updateAvgResponseTime(workspaceId, leadId, latencyMs);
        break;
      }
      case 'twilio.sms.latency': {
        const latencyMs = Number(metadata?.latencyMs ?? 0);
        await HealthCollector.recordTwilioLatency(workspaceId, latencyMs, this.prisma);
        break;
      }
      case 'crm.sync.result': {
        const success = Boolean(metadata?.success);
        const crm = String(metadata?.crm ?? 'unknown');
        await HealthCollector.recordCRMSyncResult(workspaceId, success, crm, this.prisma);
        break;
      }
      case 'queue.lag': {
        const queueName = String(metadata?.queueName ?? 'unknown');
        const lag = Number(metadata?.lag ?? 0);
        await HealthCollector.recordQueueLag(queueName, lag, this.prisma);
        break;
      }
      case 'lead.assigned': {
        if (!leadId) break;
        await this.handleLeadAssigned(workspaceId, leadId);
        break;
      }
      case 'lead.converted': {
        if (!leadId) break;
        await this.handleLeadConverted(workspaceId, leadId);
        break;
      }
      default:
        logger.debug({ event, workspaceId }, 'analytics-ingest: unhandled event type');
    }
  }

  private async handleLeadAssigned(workspaceId: string, leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, deletedAt: null },
      select: { assignedWorkspaceUserId: true },
    });

    if (!lead?.assignedWorkspaceUserId) return;

    const wu = await this.prisma.workspaceUser.findFirst({
      where: { id: lead.assignedWorkspaceUserId, workspaceId, isActive: true },
    });

    if (!wu) return;

    await this.prisma.workspaceUser.update({
      where: { id: wu.id },
      data: { totalLeadsAssigned: { increment: 1 } },
    });
  }

  private async handleLeadConverted(workspaceId: string, leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, deletedAt: null },
      select: { assignedWorkspaceUserId: true },
    });

    if (!lead?.assignedWorkspaceUserId) return;

    const wu = await this.prisma.workspaceUser.findFirst({
      where: { id: lead.assignedWorkspaceUserId, workspaceId, isActive: true },
    });

    if (!wu) return;

    const newConversions = wu.totalConversions + 1;
    const conversionRate =
      wu.totalLeadsAssigned > 0
        ? Math.round((newConversions / wu.totalLeadsAssigned) * 10000) / 10000
        : 0;

    await this.prisma.workspaceUser.update({
      where: { id: wu.id },
      data: { totalConversions: newConversions, conversionRate },
    });
  }

  private async updateAvgResponseTime(
    workspaceId: string,
    leadId: string | undefined,
    latencyMs: number,
  ): Promise<void> {
    if (!leadId) return;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, deletedAt: null },
      select: { assignedWorkspaceUserId: true },
    });

    if (!lead?.assignedWorkspaceUserId) return;

    const wu = await this.prisma.workspaceUser.findFirst({
      where: { id: lead.assignedWorkspaceUserId, workspaceId, isActive: true },
    });

    if (!wu) return;

    // Rolling average: new = (old * N + new) / (N + 1), approximate with simple EMA
    const current = wu.avgResponseTimeMs ?? latencyMs;
    const updated = Math.round(current * 0.9 + latencyMs * 0.1);

    await this.prisma.workspaceUser.update({
      where: { id: wu.id },
      data: { avgResponseTimeMs: updated },
    });
  }
}
