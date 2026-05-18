export class ListLeadsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly status?: string,
    public readonly tier?: string,
    public readonly source?: string,
    public readonly assignedTo?: string,
    public readonly search?: string,
    public readonly cursor?: string,
    public readonly limit?: number,
  ) {}
}

export interface LeadListDto {
  items: Array<{
    id: string;
    source: string;
    status: string;
    tier: string;
    score: number;
    name: string | null;
    phone: string | null;
    email: string | null;
    assignedWorkspaceUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  nextCursor: string | null;
}
