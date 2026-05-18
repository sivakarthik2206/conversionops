export class TakeoverConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly workspaceId: string,
    public readonly agentId: string,
    public readonly reason?: string,
  ) {}
}
