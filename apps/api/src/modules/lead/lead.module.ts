import { Module } from '@nestjs/common';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { CreateLeadHandler } from './commands/create-lead.handler';
import { AssignLeadHandler } from './commands/assign-lead.handler';
import { QualifyLeadHandler } from './commands/qualify-lead.handler';
import { ReactivateLeadHandler } from './commands/reactivate-lead.handler';
import { GetLeadHandler } from './queries/get-lead.handler';
import { ListLeadsHandler } from './queries/list-leads.handler';
import { GetConversionFunnelHandler } from './queries/get-conversion-funnel.handler';

@Module({
  controllers: [LeadController],
  providers: [
    LeadService,
    CreateLeadHandler,
    AssignLeadHandler,
    QualifyLeadHandler,
    ReactivateLeadHandler,
    GetLeadHandler,
    ListLeadsHandler,
    GetConversionFunnelHandler,
  ],
  exports: [LeadService],
})
export class LeadModule {}
