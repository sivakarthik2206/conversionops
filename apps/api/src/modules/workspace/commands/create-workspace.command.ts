export class CreateWorkspaceCommand {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly ownerEmail: string,
    public readonly ownerUserId: string,
    public readonly timezone: string = 'America/New_York',
    public readonly plan: 'SOLO' | 'BROKERAGE' | 'ENTERPRISE' = 'SOLO',
  ) {}
}
