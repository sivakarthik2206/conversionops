import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';
import type { Appointment, Prisma } from '@conversionops/db';
import { ListAppointmentsQuery } from './list-appointments.query';

export interface AppointmentPage {
  items: Appointment[];
  nextCursor: string | null;
}

@Injectable()
export class ListAppointmentsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListAppointmentsQuery): Promise<Result<AppointmentPage>> {
    try {
      const where: Prisma.AppointmentWhereInput = {
        workspaceId: query.workspaceId,
        deletedAt: null,
        ...(query.status && { status: query.status }),
        ...(query.workspaceUserId && { workspaceUserId: query.workspaceUserId }),
        ...(query.from || query.to) && {
          scheduledAt: {
            ...(query.from && { gte: query.from }),
            ...(query.to && { lte: query.to }),
          },
        },
      };

      const items = await this.prisma.appointment.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        take: query.limit + 1,
        ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      });

      const hasNext = items.length > query.limit;
      if (hasNext) items.pop();

      return {
        ok: true,
        value: {
          items,
          nextCursor: hasNext && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
        },
      };
    } catch (err) {
      logger.error({ err }, 'ListAppointmentsHandler error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
