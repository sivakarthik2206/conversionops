export class GetLeadEventsQuery {
  constructor(
    public readonly leadId: string,
    public readonly workspaceId: string,
  ) {}
}

export interface LeadEventDto {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  triggeredBy: string | null;
  occurredAt: string;
  sequence: number;
}
