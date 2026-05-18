export class ReleaseToAICommand {
  constructor(
    public readonly conversationId: string,
    public readonly workspaceId: string,
    public readonly agentId: string,
  ) {}
}
