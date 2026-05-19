export class CreateAppointmentCommand {
  constructor(
    public readonly leadId: string,
    public readonly workspaceId: string,
    public readonly scheduledAt: Date,
    public readonly timezone: string,
    public readonly durationMinutes: number,
    public readonly workspaceUserId?: string,
    public readonly location?: string,
    public readonly notes?: string,
    public readonly externalBookingId?: string,
    public readonly bookingUrl?: string,
  ) {}
}
