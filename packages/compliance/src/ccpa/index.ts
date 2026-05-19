import type { PrismaClient } from '@conversionops/db';
import { logger } from '@conversionops/observability';

export interface DeletionReport {
  requestedBy: string;
  reason: string;
  deletedAt: string;
  affectedLeads: number;
  affectedMessages: number;
  workspacesAffected: string[];
}

export interface UserDataExport {
  exportedAt: string;
  phone: string;
  leads: Array<{
    id: string;
    source: string;
    createdAt: string;
    qualification: Record<string, unknown>;
    conversations: Array<{
      id: string;
      messages: Array<{
        role: string;
        content: string;
        createdAt: string;
      }>;
    }>;
  }>;
}

/**
 * CCPA data deletion. NOT workspace-scoped — data subject right crosses all workspaces.
 * Anonymises PII in Lead and Message records. Writes immutable audit log.
 */
export async function deletePII(
  request: { phone?: string; email?: string; requestedBy: string; reason: string },
  prisma: PrismaClient,
): Promise<DeletionReport> {
  if (!request.phone && !request.email) {
    throw new Error('deletePII: phone or email required');
  }

  const where = request.phone
    ? request.email
      ? { OR: [{ phone: request.phone }, { email: request.email }] }
      : { phone: request.phone }
    : { email: request.email as string };

  return prisma.$transaction(async (tx) => {
    const leads = await tx.lead.findMany({
      where: { ...where, deletedAt: null },
      select: { id: true, workspaceId: true },
    });

    if (leads.length === 0) {
      const report: DeletionReport = {
        requestedBy: request.requestedBy,
        reason: request.reason,
        deletedAt: new Date().toISOString(),
        affectedLeads: 0,
        affectedMessages: 0,
        workspacesAffected: [],
      };

      await tx.auditLog.create({
        data: {
          action: 'pii.deletion',
          resource: 'lead',
          metadata: JSON.parse(JSON.stringify(report)),
        },
      });

      return report;
    }

    const leadIds = leads.map(l => l.id);
    const workspacesAffected = [...new Set(leads.map(l => l.workspaceId))];

    await tx.lead.updateMany({
      where: { id: { in: leadIds } },
      data: {
        name: null,
        phone: null,
        email: null,
        fullName: null,
        piiDeletedAt: new Date(),
      },
    });

    const conversations = await tx.conversation.findMany({
      where: { leadId: { in: leadIds } },
      select: { id: true },
    });

    const conversationIds = conversations.map(c => c.id);
    let affectedMessages = 0;

    if (conversationIds.length > 0) {
      const { count } = await tx.message.updateMany({
        where: { conversationId: { in: conversationIds } },
        data: { content: '[PII DELETED per CCPA request]' },
      });
      affectedMessages = count;
    }

    const report: DeletionReport = {
      requestedBy: request.requestedBy,
      reason: request.reason,
      deletedAt: new Date().toISOString(),
      affectedLeads: leads.length,
      affectedMessages,
      workspacesAffected,
    };

    await tx.auditLog.create({
      data: {
        action: 'pii.deletion',
        resource: 'lead',
        metadata: JSON.parse(JSON.stringify(report)),
      },
    });

    logger.info({ affectedLeads: leads.length, affectedMessages }, 'CCPA deletePII completed');
    return report;
  });
}

/**
 * Exports all data for a phone number across all workspaces.
 * Returns structured JSON per CCPA right of access.
 */
export async function exportUserData(
  phone: string,
  prisma: PrismaClient,
): Promise<UserDataExport> {
  const leads = await prisma.lead.findMany({
    where: { phone, deletedAt: null },
    include: {
      conversations: {
        where: { deletedAt: null },
        include: {
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            select: { role: true, content: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    exportedAt: new Date().toISOString(),
    phone,
    leads: leads.map(lead => ({
      id: lead.id,
      source: lead.source,
      createdAt: lead.createdAt.toISOString(),
      qualification: (lead.qualification as Record<string, unknown>) ?? {},
      conversations: lead.conversations.map(conv => ({
        id: conv.id,
        messages: conv.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
        })),
      })),
    })),
  };
}

