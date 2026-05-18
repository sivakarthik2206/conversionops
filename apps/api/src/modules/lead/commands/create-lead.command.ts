export class CreateLeadCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly createdByUserId: string,
    public readonly source: string,
    public readonly name?: string,
    public readonly phone?: string,
    public readonly email?: string,
    public readonly externalId?: string,
    public readonly sourcePayload?: Record<string, unknown>,
  ) {}
}
