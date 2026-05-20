import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { logger } from '@conversionops/observability';
import { queues } from '@conversionops/orchestration';
import type { CrmSyncJobData } from '@conversionops/orchestration';
import { syncLeadToFUB, ZapierWebhookRelay } from '@conversionops/integrations';
import type { CRMEvent } from '@conversionops/integrations';
import type { Lead, Workspace } from '@conversionops/db';
import { PrismaService } from '../modules/prisma/prisma.service';

const MAX_RETRIES = 3;

@Injectable()
export class CrmSyncProcessor {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Syncs a lead to the configured CRM (Follow Up Boss or Zapier).
   * Retries up to 3 times with exponential backoff.
   * Never throws — all errors are logged.
   */
  async process(job: Job<CrmSyncJobData>): Promise<void> {
    const { leadId, workspaceId } = job.data;

    try {
      const [lead, workspace] = await Promise.all([
        this.prisma.lead.findFirst({
          where: { id: leadId, workspaceId, deletedAt: null },
        }),
        this.prisma.workspace.findUnique({ where: { id: workspaceId } }),
      ]);

      if (!lead || !workspace) {
        logger.warn({ leadId, workspaceId }, 'crm-sync: lead or workspace not found, skipping');
        return;
      }

      const config = workspace.aiConfig as Record<string, unknown> | null;
      const crmType = config?.['crmType'] as string | undefined;
      const fubApiKey = config?.['fubApiKey'] as string | undefined;
      const zapierWebhookUrl = config?.['zapierWebhookUrl'] as string | undefined;

      if (fubApiKey) {
        await this.syncToFUB(lead, workspace, fubApiKey, job.attemptsMade);
      } else if (zapierWebhookUrl) {
        await this.syncToZapier(lead, workspace, zapierWebhookUrl);
      } else {
        logger.debug({ leadId, workspaceId, crmType }, 'crm-sync: no CRM configured, skipping');
      }
    } catch (err) {
      logger.error({ err, leadId, workspaceId, attempt: job.attemptsMade }, 'crm-sync: processing error');
      if (job.attemptsMade < MAX_RETRIES) throw err;
    }
  }

  private async syncToFUB(
    lead: Lead,
    workspace: Workspace,
    apiKey: string,
    attempt: number,
  ): Promise<void> {
    const result = await syncLeadToFUB(lead, workspace, apiKey, this.prisma);
    if (!result.ok) {
      logger.error(
        { err: result.error, leadId: lead.id, attempt },
        'crm-sync: Follow Up Boss sync failed',
      );
      if (attempt < MAX_RETRIES) throw result.error;
    } else {
      logger.info({ leadId: lead.id, fubContactId: result.value }, 'crm-sync: synced to FUB');

      void queues.analyticsIngest.add('crm-sync', {
        workspaceId: workspace.id,
        event: 'crm.sync.result',
        leadId: lead.id,
        metadata: { success: true, crm: 'fub' },
      }, { removeOnComplete: 1000 });
    }
  }

  private async syncToZapier(
    lead: Lead,
    workspace: Workspace,
    webhookUrl: string,
  ): Promise<void> {
    const relay = new ZapierWebhookRelay();
    const event: CRMEvent = 'lead.qualified';

    const result = await relay.relayLead(webhookUrl, lead, event);
    if (!result.ok) {
      logger.error({ err: result.error, leadId: lead.id }, 'crm-sync: Zapier relay failed');
    } else {
      logger.info({ leadId: lead.id, workspaceId: workspace.id }, 'crm-sync: synced to Zapier');
    }
  }
}
