import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';
import type { Appointment } from '@conversionops/db';
import { GetAppointmentQuery } from './get-appointment.query';

@Injectable()
export class GetAppointmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAppointmentQuery): Promise<Result<Appointment & { lead: { name: string | null; phone: string | null; score: number; tier: string } | null }>> {
    try {
      const appointment = await this.prisma.appointment.findFirst({
        where: { id: query.appointmentId, workspaceId: query.workspaceId, deletedAt: null },
        include: {
          lead: {
            select: { name: true, phone: true, score: true, tier: true },
          },
        },
      });
      if (!appointment) return { ok: false, error: new Error('Appointment not found') };
      return { ok: true, value: appointment };
    } catch (err) {
      logger.error({ err }, 'GetAppointmentHandler error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
