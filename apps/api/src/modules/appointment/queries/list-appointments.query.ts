import type { AppointmentStatus } from '@conversionops/db';

export class ListAppointmentsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly status?: AppointmentStatus,
    public readonly workspaceUserId?: string,
    public readonly from?: Date,
    public readonly to?: Date,
    public readonly cursor?: string,
    public readonly limit: number = 25,
  ) {}
}
