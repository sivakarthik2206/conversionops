export class UpdateWorkspaceCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly data: {
      name?: string;
      timezone?: string;
      aiConfig?: Record<string, unknown>;
      twilioNumber?: string;
      followUpBossApiKey?: string;
      calComUsername?: string;
      calComLink?: string;
    },
  ) {}
}
