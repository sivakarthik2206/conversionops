export class GetConversationQuery {
  constructor(
    public readonly conversationId: string,
    public readonly workspaceId: string,
  ) {}
}

export interface ConversationDetailDto {
  id: string;
  workspaceId: string;
  leadId: string;
  channel: string;
  status: string;
  aiActive: boolean;
  escalationLevel: string;
  escalationReason: string | null;
  takenOverBy: string | null;
  takenOverAt: Date | null;
  contextSummary: string | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    status: string;
    tier: string;
    score: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
