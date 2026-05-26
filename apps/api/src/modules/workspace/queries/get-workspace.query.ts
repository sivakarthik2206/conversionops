export class GetWorkspaceQuery {
  constructor(public readonly workspaceId: string) {}
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  timezone: string;
  aiPaused: boolean;
  tokenUsageCurrentMonth: number;
  tokenQuotaMonthly: number;
  tokenUsagePercent: number;
  agentCount: number;
  onboardingStep: number;
  ownerEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceHealthDto {
  totalLeads: number;
  qualifiedRate: number;
  appointmentsBooked: number;
  avgResponseMs: number;
}
