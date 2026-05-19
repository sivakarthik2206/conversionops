import type { AppointmentStatus } from '@conversionops/db';

export class UpdateAppointmentCommand {
  constructor(
    public readonly appointmentId: string,
    public readonly workspaceId: string,
    public readonly scheduledAt?: Date,
    public readonly status?: AppointmentStatus,
    public readonly location?: string,
    public readonly notes?: string,
    public readonly cancellationReason?: string,
  ) {}
}
