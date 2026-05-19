import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues, EventStore, transitionLead, NotificationService } from '@conversionops/orchestration';
import type { LeadRoutingJobData } from '@conversionops/orchestration';
import { RoutingStrategy, LeadStatus, NotificationType } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';
import { RealtimeEmitterService } from '../modules/realtime/realtime-emitter.service';

interface RoutingCandidate {
  workspaceUserId: string;
  score: number;
  reason: string;
}

@Injectable()
export class LeadRoutingProcessor {
  private readonly eventStore: EventStore;
  private readonly notificationService: NotificationService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {
    this.eventStore = new EventStore(prisma);
    this.notificationService = new NotificationService(queues.notification);
  }

  /**
   * Processes lead-routing jobs. Evaluates routing rules, assigns the lead,
   * transitions the XState machine, and notifies the assigned agent.
   */
  async process(job: Job<LeadRoutingJobData>): Promise<void> {
    const { leadId, workspaceId } = job.data;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, deletedAt: null },
    });

    if (!lead) {
      logger.warn({ leadId, workspaceId }, 'lead-routing: lead not found, skipping');
      return;
    }

    const rules = await this.prisma.routingRule.findMany({
      where: { workspaceId, isActive: true, deletedAt: null },
      orderBy: { priority: 'desc' },
      include: { targetAgents: true },
    });

    const qualification = lead.qualification as Record<string, unknown>;
    const candidate = await this.evaluateRules(rules, lead, qualification, workspaceId);

    if (!candidate) {
      logger.warn({ leadId, workspaceId }, 'lead-routing: no matching agent found, skipping assignment');
      return;
    }

    await this.prisma.leadAssignment.create({
      data: {
        leadId,
        workspaceId,
        workspaceUserId: candidate.workspaceUserId,
        routingReason: candidate.reason,
        routingScore: candidate.score,
        isPrimary: true,
      },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { assignedWorkspaceUserId: candidate.workspaceUserId },
    });

    const newStatus = transitionLead(lead.status, { type: 'ASSIGN' }, { leadId, workspaceId });

    if (newStatus !== lead.status) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { status: newStatus },
      });
    }

    await this.eventStore.append({
      leadId,
      workspaceId,
      type: 'lead.assigned',
      payload: {
        workspaceUserId: candidate.workspaceUserId,
        reason: candidate.reason,
        score: candidate.score,
        previousStatus: lead.status,
        newStatus,
      },
      triggerSource: 'lead-routing-processor',
    });

    await this.notificationService
      .notifyAgent(candidate.workspaceUserId, NotificationType.HOT_LEAD_ALERT, {
        leadId,
        workspaceId,
        leadName: lead.name ?? 'Unknown',
        source: lead.source,
        score: lead.score,
      })
      .catch((err: unknown) => logger.error({ err, leadId }, 'lead-routing: notification failed'));

    this.realtimeEmitter.emitToWorkspace(workspaceId, 'lead:assigned', {
      leadId,
      workspaceUserId: candidate.workspaceUserId,
      routingReason: candidate.reason,
    });

    logger.info({ leadId, workspaceId, assignedTo: candidate.workspaceUserId }, 'lead-routing: assigned successfully');
  }

  private async evaluateRules(
    rules: Array<{
      id: string;
      strategy: RoutingStrategy;
      conditions: unknown;
      targetAgents: Array<{ id: string; isAvailable: boolean; languages: string[]; serviceAreas: string[]; conversionRate: number; totalLeadsAssigned: number }>;
      targetUserIds: string[];
    }>,
    lead: { id: string; score: number; qualification: unknown },
    qualification: Record<string, unknown>,
    workspaceId: string,
  ): Promise<RoutingCandidate | null> {
    for (const rule of rules) {
      const conditions = rule.conditions as Record<string, unknown>;
      if (!this.conditionsMatch(conditions, qualification, lead.score)) continue;

      const candidate = await this.applyStrategy(rule, qualification, workspaceId);
      if (candidate) {
        return { ...candidate, reason: `Rule: ${rule.id} (${rule.strategy})` };
      }
    }
    return null;
  }

  private conditionsMatch(
    conditions: Record<string, unknown>,
    qualification: Record<string, unknown>,
    score: number,
  ): boolean {
    if (typeof conditions['minScore'] === 'number' && score < conditions['minScore']) return false;
    if (typeof conditions['maxScore'] === 'number' && score > conditions['maxScore']) return false;
    if (typeof conditions['language'] === 'string') {
      const leadLang = typeof qualification['language'] === 'string' ? qualification['language'] : 'en';
      if (!leadLang.startsWith(conditions['language'])) return false;
    }
    if (typeof conditions['area'] === 'string') {
      const leadArea = typeof qualification['area'] === 'string' ? qualification['area'] : '';
      if (!leadArea.toLowerCase().includes((conditions['area'] as string).toLowerCase())) return false;
    }
    return true;
  }

  private async applyStrategy(
    rule: {
      id: string;
      strategy: RoutingStrategy;
      targetAgents: Array<{ id: string; isAvailable: boolean; languages: string[]; serviceAreas: string[]; conversionRate: number; totalLeadsAssigned: number }>;
      targetUserIds: string[];
      conditions: unknown;
    },
    qualification: Record<string, unknown>,
    workspaceId: string,
  ): Promise<Omit<RoutingCandidate, 'reason'> | null> {
    const availableAgents = rule.targetAgents.filter((a) => a.isAvailable);
    if (availableAgents.length === 0) return null;

    switch (rule.strategy) {
      case RoutingStrategy.LANGUAGE: {
        const lang = typeof qualification['language'] === 'string' ? qualification['language'] : 'en';
        const match = availableAgents.find((a) => a.languages.some((l) => l.startsWith(lang)));
        return match ? { workspaceUserId: match.id, score: 1 } : null;
      }
      case RoutingStrategy.GEOGRAPHY: {
        const area = typeof qualification['area'] === 'string' ? qualification['area'] : '';
        const match = availableAgents.find((a) =>
          a.serviceAreas.some((sa) => sa.toLowerCase().includes(area.toLowerCase())),
        );
        return match ? { workspaceUserId: match.id, score: 1 } : null;
      }
      case RoutingStrategy.AVAILABILITY: {
        const match = availableAgents[0];
        return match ? { workspaceUserId: match.id, score: 1 } : null;
      }
      case RoutingStrategy.PERFORMANCE_BASED: {
        const best = availableAgents.reduce((a, b) => (a.conversionRate >= b.conversionRate ? a : b));
        return { workspaceUserId: best.id, score: best.conversionRate };
      }
      case RoutingStrategy.ROUND_ROBIN: {
        const counts = await this.prisma.leadAssignment.groupBy({
          by: ['workspaceUserId'],
          where: { workspaceId, workspaceUserId: { in: availableAgents.map((a) => a.id) } },
          _count: { _all: true },
        });
        const countMap = new Map(counts.map((c) => [c.workspaceUserId, c._count._all]));
        const least = availableAgents.reduce((a, b) =>
          (countMap.get(a.id) ?? 0) <= (countMap.get(b.id) ?? 0) ? a : b,
        );
        return { workspaceUserId: least.id, score: 1 };
      }
      default:
        return availableAgents[0] ? { workspaceUserId: availableAgents[0].id, score: 1 } : null;
    }
  }
}
