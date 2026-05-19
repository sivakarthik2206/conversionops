export class GetAppointmentQuery {
  constructor(
    public readonly appointmentId: string,
    public readonly workspaceId: string,
  ) {}
}
