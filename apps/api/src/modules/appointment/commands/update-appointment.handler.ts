import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStore, transitionLead } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Appointment } from '@conversionops/db';
import { LeadStatus } from '@conversionops/db';
import { UpdateAppointmentCommand } from './update-appointment.command';

@Injectable()
export class UpdateAppointmentHandler {
  private readonly eventStore: EventStore;

  constructor(private readonly prisma: PrismaService) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Updates an Appointment and handles status transitions.
   * CANCELLED → transitions lead back to QUALIFIED.
   * COMPLETED → transitions lead to CONVERTED.
   */
  async execute(cmd: UpdateAppointmentCommand): Promise<Result<Appointment>> {
    try {
      const existing = await this.prisma.appointment.findFirst({
        where: { id: cmd.appointmentId, workspaceId: cmd.workspaceId, deletedAt: null },
        include: { lead: true },
      });
      if (!existing) throw new TenantLeakageError(cmd.appointmentId, cmd.workspaceId);

      const updateData: Record<string, unknown> = {};
      if (cmd.scheduledAt) updateData['scheduledAt'] = cmd.scheduledAt;
      if (cmd.status) updateData['status'] = cmd.status;
      if (cmd.location !== undefined) updateData['location'] = cmd.location;
      if (cmd.notes !== undefined) updateData['notes'] = cmd.notes;
      if (cmd.cancellationReason) {
        updateData['cancellationReason'] = cmd.cancellationReason;
        updateData['cancelledAt'] = new Date();
      }
      if (cmd.status === 'COMPLETED') updateData['completedAt'] = new Date();

      const updated = await this.prisma.appointment.update({
        where: { id: cmd.appointmentId },
        data: updateData,
      });

      if (cmd.status === 'CANCELLED' && existing.lead) {
        const newStatus = transitionLead(
          existing.lead.status,
          { type: 'DISQUALIFY' },
          { leadId: existing.leadId, workspaceId: cmd.workspaceId },
        );
        const revertStatus = newStatus !== existing.lead.status ? newStatus : LeadStatus.QUALIFIED;
        await this.prisma.lead.update({
          where: { id: existing.leadId, workspaceId: cmd.workspaceId },
          data: { status: revertStatus as LeadStatus },
        });
        await this.eventStore.append({
          leadId: existing.leadId,
          workspaceId: cmd.workspaceId,
          type: 'lead.appointment.cancelled',
          payload: { appointmentId: cmd.appointmentId, reason: cmd.cancellationReason },
          triggerSource: 'update-appointment-handler',
        });
      }

      if (cmd.status === 'COMPLETED' && existing.lead) {
        const newStatus = transitionLead(
          existing.lead.status,
          { type: 'CONVERT' },
          { leadId: existing.leadId, workspaceId: cmd.workspaceId },
        );
        if (newStatus !== existing.lead.status) {
          await this.prisma.lead.update({
            where: { id: existing.leadId, workspaceId: cmd.workspaceId },
            data: { status: newStatus as LeadStatus },
          });
        }
        await this.eventStore.append({
          leadId: existing.leadId,
          workspaceId: cmd.workspaceId,
          type: 'lead.converted',
          payload: { appointmentId: cmd.appointmentId },
          triggerSource: 'update-appointment-handler',
        });
      }

      return { ok: true, value: updated };
    } catch (err) {
      if (err instanceof TenantLeakageError) throw err;
      logger.error({ err }, 'UpdateAppointmentHandler error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
