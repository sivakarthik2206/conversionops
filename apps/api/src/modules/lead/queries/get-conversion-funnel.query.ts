export class GetConversionFunnelQuery {
  constructor(public readonly workspaceId: string) {}
}

export interface FunnelStageDto {
  status: string;
  count: number;
  conversionRate: number;
}

export interface ConversionFunnelDto {
  stages: FunnelStageDto[];
  totalLeads: number;
}
