import { Injectable } from '@nestjs/common';
import type { Result } from '@conversionops/types';
import type { Appointment } from '@conversionops/db';
import type { AppointmentStatus } from '@conversionops/db';
import { CreateAppointmentHandler } from './commands/create-appointment.handler';
import { UpdateAppointmentHandler } from './commands/update-appointment.handler';
import { ListAppointmentsHandler, type AppointmentPage } from './queries/list-appointments.handler';
import { GetAppointmentHandler } from './queries/get-appointment.handler';
import { CreateAppointmentCommand } from './commands/create-appointment.command';
import { UpdateAppointmentCommand } from './commands/update-appointment.command';
import { ListAppointmentsQuery } from './queries/list-appointments.query';
import { GetAppointmentQuery } from './queries/get-appointment.query';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly createHandler: CreateAppointmentHandler,
    private readonly updateHandler: UpdateAppointmentHandler,
    private readonly listHandler: ListAppointmentsHandler,
    private readonly getHandler: GetAppointmentHandler,
  ) {}

  createAppointment(cmd: CreateAppointmentCommand): Promise<Result<Appointment>> {
    return this.createHandler.execute(cmd);
  }

  updateAppointment(cmd: UpdateAppointmentCommand): Promise<Result<Appointment>> {
    return this.updateHandler.execute(cmd);
  }

  listAppointments(workspaceId: string, filters?: Partial<{ status: AppointmentStatus; workspaceUserId: string; from: Date; to: Date; cursor: string; limit: number }>): Promise<Result<AppointmentPage>> {
    return this.listHandler.execute(
      new ListAppointmentsQuery(
        workspaceId,
        filters?.status,
        filters?.workspaceUserId,
        filters?.from,
        filters?.to,
        filters?.cursor,
        filters?.limit,
      ),
    );
  }

  getAppointment(appointmentId: string, workspaceId: string) {
    return this.getHandler.execute(new GetAppointmentQuery(appointmentId, workspaceId));
  }
}
