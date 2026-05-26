import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ListOptions {
  limit: number;
  offset: number;
  type?: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, opts: ListOptions) {
    const where = {
      workspaceId,
      deletedAt: null,
      ...(opts.type ? { type: opts.type as never } : {}),
    };

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [notifications, total, recentCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: opts.limit,
        skip: opts.offset,
        select: {
          id: true,
          type: true,
          status: true,
          channel: true,
          subject: true,
          body: true,
          metadata: true,
          leadId: true,
          createdAt: true,
          lead: {
            select: { id: true, name: true, phone: true },
          },
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...where, createdAt: { gte: cutoff } },
      }),
    ]);

    return { notifications, total, recentCount, limit: opts.limit, offset: opts.offset };
  }

  async getUnreadCount(workspaceId: string): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.prisma.notification.count({
      where: { workspaceId, deletedAt: null, createdAt: { gte: cutoff } },
    });
  }

  async markRead(workspaceId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, workspaceId, deletedAt: null },
      data: { status: 'SENT' },
    });
  }

  async markAllRead(workspaceId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { workspaceId, status: 'PENDING', deletedAt: null },
      data: { status: 'SENT' },
    });
    return { count: result.count };
  }
}
