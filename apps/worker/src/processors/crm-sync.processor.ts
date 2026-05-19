import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { EventStore } from '@conversionops/orchestration';
import type { CrmSyncJobData } from '@conversionops/orchestration';
import { syncLeadToFUB, ZapierWebhookRelay, FollowUpBossClient } from '@conversionops/integrations';
import { withRetry } from '@conversionops/sdk-standards';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class CrmSyncProcessor {
  private readonly eventStore: EventStore;

  constructor(private readonly prisma: PrismaService) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Syncs a qualified lead to CRM. Tries FUB first, falls back to Zapier.
   * CRM failure never blocks the lead flow — always logs and completes the job.
   */
  async process(job: Job<CrmSyncJobData>): Promise<void> {
    const { leadId, workspaceId } = job.data;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId, deletedAt: null },
    });
    if (!lead) {
      logger.warn({ leadId, workspaceId }, 'crm-sync: lead not found, skipping');
      return;
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) return;

    const conversations = await this.prisma.conversation.findMany({
      where: { leadId, workspaceId, deletedAt: null },
      include: {
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true, createdAt: true },
        },
      },
    });

    const aiConfig = workspace.aiConfig as Record<string, unknown>;
    const fubApiKey = typeof aiConfig['followUpBossApiKey'] === 'string' ? aiConfig['followUpBossApiKey'] : null;
    const zapierUrl = typeof aiConfig['zapierWebhookUrl'] === 'string' ? aiConfig['zapierWebhookUrl'] : null;

    let synced = false;

    if (fubApiKey) {
      try {
        const client = new FollowUpBossClient(fubApiKey);
        const result = await withRetry(
          () => syncLeadToFUB(lead, conversations, workspace, this.prisma, client),
          { attempts: 3, backoffMs: 1000 },
        );

        if (result.ok) {
          synced = true;
          await this.eventStore.append({
            leadId, workspaceId, type: 'lead.crm.synced',
            payload: { provider: 'follow-up-boss' }, triggerSource: 'crm-sync-processor',
          });
        } else {
          logger.warn({ leadId, err: result.error }, 'crm-sync: FUB sync failed, trying Zapier fallback');
        }
      } catch (err: unknown) {
        logger.error({ err, leadId }, 'crm-sync: FUB sync error');
      }
    }

    if (!synced && zapierUrl) {
      try {
        const relay = new ZapierWebhookRelay();
        const event = lead.status === 'CONVERTED' ? 'lead.qualified' as const
          : lead.assignedWorkspaceUserId ? 'lead.assigned' as const
          : 'lead.created' as const;

        const result = await relay.relayLead(zapierUrl, lead, event, conversations);
        if (result.ok) {
          synced = true;
          await this.eventStore.append({
            leadId, workspaceId, type: 'lead.crm.synced',
            payload: { provider: 'zapier' }, triggerSource: 'crm-sync-processor',
          });
        } else {
          logger.warn({ leadId, err: result.error }, 'crm-sync: Zapier relay failed');
          await this.eventStore.append({
            leadId, workspaceId, type: 'lead.crm.sync-failed',
            payload: { error: result.error.message }, triggerSource: 'crm-sync-processor',
          });
        }
      } catch (err: unknown) {
        logger.error({ err, leadId }, 'crm-sync: Zapier error');
      }
    }

    if (!synced && !fubApiKey && !zapierUrl) {
      logger.info({ leadId, workspaceId }, 'crm-sync: no CRM configured for workspace');
    }
  }
}
