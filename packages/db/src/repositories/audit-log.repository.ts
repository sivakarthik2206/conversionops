import { PrismaClient, AuditLog, Prisma } from '@prisma/client';

export class AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates an immutable audit log entry. 7-year legal hold — never purge.
   */
  async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }

  /**
   * Lists audit log entries for a workspace.
   */
  async findMany(workspaceId: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
