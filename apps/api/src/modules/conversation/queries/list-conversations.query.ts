export class ListConversationsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly status?: string,
    public readonly aiActive?: boolean,
    public readonly assignedAgent?: string,
    public readonly cursor?: string,
    public readonly limit?: number,
  ) {}
}

export interface ConversationSummaryDto {
  id: string;
  workspaceId: string;
  leadId: string;
  channel: string;
  status: string;
  aiActive: boolean;
  escalationLevel: string;
  takenOverBy: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationListDto {
  items: ConversationSummaryDto[];
  nextCursor: string | null;
}
