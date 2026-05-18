export class AssignLeadCommand {
  constructor(
    public readonly leadId: string,
    public readonly workspaceId: string,
    public readonly assignedByUserId: string,
    public readonly targetWorkspaceUserId: string,
    public readonly routingReason?: string,
  ) {}
}
