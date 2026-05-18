export class ReactivateLeadCommand {
  constructor(
    public readonly leadId: string,
    public readonly workspaceId: string,
    public readonly reactivatedByUserId: string,
  ) {}
}
