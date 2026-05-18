import { Injectable } from '@nestjs/common';
import { Result } from '@conversionops/types';
import type { Lead } from '@conversionops/db';
import { CreateLeadHandler } from './commands/create-lead.handler';
import { CreateLeadCommand } from './commands/create-lead.command';
import { AssignLeadHandler } from './commands/assign-lead.handler';
import { AssignLeadCommand } from './commands/assign-lead.command';
import { QualifyLeadHandler } from './commands/qualify-lead.handler';
import { QualifyLeadCommand } from './commands/qualify-lead.command';
import { ReactivateLeadHandler } from './commands/reactivate-lead.handler';
import { ReactivateLeadCommand } from './commands/reactivate-lead.command';
import { GetLeadHandler } from './queries/get-lead.handler';
import { GetLeadQuery, LeadDetailDto } from './queries/get-lead.query';
import { ListLeadsHandler } from './queries/list-leads.handler';
import { ListLeadsQuery, LeadListDto } from './queries/list-leads.query';
import { GetConversionFunnelHandler } from './queries/get-conversion-funnel.handler';
import { GetConversionFunnelQuery, ConversionFunnelDto } from './queries/get-conversion-funnel.query';

@Injectable()
export class LeadService {
  constructor(
    private readonly createHandler: CreateLeadHandler,
    private readonly assignHandler: AssignLeadHandler,
    private readonly qualifyHandler: QualifyLeadHandler,
    private readonly reactivateHandler: ReactivateLeadHandler,
    private readonly getHandler: GetLeadHandler,
    private readonly listHandler: ListLeadsHandler,
    private readonly funnelHandler: GetConversionFunnelHandler,
  ) {}

  createLead(cmd: CreateLeadCommand): Promise<Result<Lead>> {
    return this.createHandler.execute(cmd);
  }

  assignLead(cmd: AssignLeadCommand): Promise<Result<Lead>> {
    return this.assignHandler.execute(cmd);
  }

  qualifyLead(cmd: QualifyLeadCommand): Promise<Result<Lead>> {
    return this.qualifyHandler.execute(cmd);
  }

  reactivateLead(cmd: ReactivateLeadCommand): Promise<Result<Lead>> {
    return this.reactivateHandler.execute(cmd);
  }

  getLead(leadId: string, workspaceId: string): Promise<Result<LeadDetailDto>> {
    return this.getHandler.execute(new GetLeadQuery(leadId, workspaceId));
  }

  listLeads(query: ListLeadsQuery): Promise<Result<LeadListDto>> {
    return this.listHandler.execute(query);
  }

  getConversionFunnel(workspaceId: string): Promise<Result<ConversionFunnelDto>> {
    return this.funnelHandler.execute(new GetConversionFunnelQuery(workspaceId));
  }
}
