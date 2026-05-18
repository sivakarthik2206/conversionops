export class QualifyLeadCommand {
  constructor(
    public readonly leadId: string,
    public readonly workspaceId: string,
    public readonly updatedByUserId: string,
    public readonly qualificationData: Record<string, unknown>,
  ) {}
}
