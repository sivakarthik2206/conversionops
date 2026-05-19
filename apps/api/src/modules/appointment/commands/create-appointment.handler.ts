import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { queues, EventStore, transitionLead } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Appointment } from '@conversionops/db';
import { LeadStatus, NotificationType } from '@conversionops/db';
import { CreateAppointmentCommand } from './create-appointment.command';

@Injectable()
export class CreateAppointmentHandler {
  private readonly eventStore: EventStore;

  constructor(private readonly prisma: PrismaService) {
    this.eventStore = new EventStore(prisma);
  }

  /**
   * Creates an Appointment, transitions lead to APPOINTMENT_SCHEDULED, enqueues CRM sync + notification.
   * @returns Result<Appointment> — never throws
   */
  async execute(cmd: CreateAppointmentCommand): Promise<Result<Appointment>> {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id: cmd.leadId, workspaceId: cmd.workspaceId, deletedAt: null },
      });
      if (!lead) throw new TenantLeakageError(cmd.leadId, cmd.workspaceId);

      const appointment = await this.prisma.appointment.create({
        data: {
          workspaceId: cmd.workspaceId,
          leadId: cmd.leadId,
          workspaceUserId: cmd.workspaceUserId,
          scheduledAt: cmd.scheduledAt,
          timezone: cmd.timezone,
          durationMinutes: cmd.durationMinutes,
          location: cmd.location,
          notes: cmd.notes,
          externalBookingId: cmd.externalBookingId,
          bookingUrl: cmd.bookingUrl,
          status: 'CONFIRMED',
        },
      });

      const newStatus = transitionLead(
        lead.status,
        { type: 'BOOK_APPOINTMENT' },
        { leadId: cmd.leadId, workspaceId: cmd.workspaceId },
      );
      if (newStatus !== lead.status) {
        await this.prisma.lead.update({
          where: { id: cmd.leadId, workspaceId: cmd.workspaceId },
          data: { status: newStatus as LeadStatus },
        });
      }

      await this.eventStore.append({
        leadId: cmd.leadId,
        workspaceId: cmd.workspaceId,
        type: 'lead.appointment.booked',
        payload: { appointmentId: appointment.id, scheduledAt: cmd.scheduledAt },
        triggerSource: 'create-appointment-handler',
      });

      await queues.crmSync
        .add('crm-sync', { leadId: cmd.leadId, workspaceId: cmd.workspaceId }, { removeOnComplete: 500 })
        .catch((err: unknown) => logger.error({ err }, 'create-appointment: crm-sync enqueue failed'));

      if (cmd.workspaceUserId) {
        await queues.notification
          .add('appointment-booked', {
            workspaceId: cmd.workspaceId,
            recipientWorkspaceUserId: cmd.workspaceUserId,
            type: NotificationType.APPOINTMENT_BOOKED,
            payload: { leadId: cmd.leadId, scheduledAt: cmd.scheduledAt },
            isOpsAlert: false,
          }, { removeOnComplete: 500, priority: 2 })
          .catch((err: unknown) => logger.error({ err }, 'create-appointment: notification enqueue failed'));
      }

      return { ok: true, value: appointment };
    } catch (err) {
      if (err instanceof TenantLeakageError) throw err;
      logger.error({ err }, 'CreateAppointmentHandler error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
