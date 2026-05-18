export class GetLeadQuery {
  constructor(
    public readonly leadId: string,
    public readonly workspaceId: string,
  ) {}
}

export interface LeadDetailDto {
  id: string;
  workspaceId: string;
  source: string;
  status: string;
  tier: string;
  score: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  externalId: string | null;
  qualification: unknown;
  assignedWorkspaceUserId: string | null;
  reactivationCount: number;
  aiPausedForLead: boolean;
  latestConversationId: string | null;
  assignmentHistory: Array<{
    id: string;
    workspaceUserId: string;
    isPrimary: boolean;
    routingReason: string | null;
    assignedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
