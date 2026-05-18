export type EscalationLevelInput = 'FLAGGED' | 'ESCALATED' | 'URGENT';

export class EscalateConversationCommand {
  constructor(
    public readonly conversationId: string,
    public readonly workspaceId: string,
    public readonly escalatedByUserId: string,
    public readonly level: EscalationLevelInput,
    public readonly reason?: string,
  ) {}
}
