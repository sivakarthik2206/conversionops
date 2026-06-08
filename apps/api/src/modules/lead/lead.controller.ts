import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import { LeadService } from './lead.service';
import { CreateLeadCommand } from './commands/create-lead.command';
import { AssignLeadCommand } from './commands/assign-lead.command';
import { QualifyLeadCommand } from './commands/qualify-lead.command';
import { ReactivateLeadCommand } from './commands/reactivate-lead.command';
import { ListLeadsQuery } from './queries/list-leads.query';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/user.decorator';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TenantLeakageError } from '@conversionops/sdk-standards';

const CreateLeadSchema = z.object({
  source: z.union([
    z.enum(['ZILLOW', 'REALTOR_COM', 'WEB_FORM', 'MISSED_CALL', 'SMS_INBOUND', 'MANUAL', 'REACTIVATION', 'REFERRAL', 'OTHER']),
    z.literal('TEST'),
  ]),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  externalId: z.string().optional(),
  sourcePayload: z.record(z.unknown()).optional(),
  message: z.string().optional(),
  test: z.boolean().optional(),
});

const AssignLeadSchema = z.object({
  targetWorkspaceUserId: z.string().cuid(),
  routingReason: z.string().optional(),
});

const QualifyLeadSchema = z.object({
  qualificationData: z.record(z.unknown()),
});

type CreateLeadDto = z.infer<typeof CreateLeadSchema>;
type AssignLeadDto = z.infer<typeof AssignLeadSchema>;
type QualifyLeadDto = z.infer<typeof QualifyLeadSchema>;

@Controller('leads')
@UseGuards(AuthGuard, RbacGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  @RequirePermission('lead:read')
  async listLeads(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('source') source?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? Math.min(parseInt(limitStr, 10), 100) : 25;
    const result = await this.leadService.listLeads(
      new ListLeadsQuery(workspace.id, status, tier, source, assignedTo, search, cursor, limit),
    );
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return result.value;
  }

  @Post()
  @RequirePermission('lead:write')
  async createLead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(CreateLeadSchema)) dto: CreateLeadDto,
  ) {
    // Test leads ("Send test lead" button) use a synthetic source so they don't
    // require a Prisma enum migration — they're stored as MANUAL with a test marker.
    const isTestLead = dto.source === 'TEST' || dto.test === true;
    const source = isTestLead ? 'MANUAL' : dto.source;
    const sourcePayload = isTestLead ? { ...dto.sourcePayload, test: true } : dto.sourcePayload;

    const result = await this.leadService.createLead(
      new CreateLeadCommand(
        workspace.id,
        user.id,
        source,
        dto.name,
        dto.phone,
        dto.email,
        dto.externalId,
        sourcePayload,
        isTestLead ? dto.message : undefined,
      ),
    );
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return result.value;
  }

  @Get(':id')
  @RequirePermission('lead:read')
  async getLead(
    @Param('id') id: string,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ) {
    const result = await this.leadService.getLead(id, workspace.id);
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Lead not found');
      throw new NotFoundException('Lead not found');
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('lead:write')
  async qualifyLead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(QualifyLeadSchema)) dto: QualifyLeadDto,
  ) {
    const result = await this.leadService.qualifyLead(
      new QualifyLeadCommand(id, workspace.id, user.id, dto.qualificationData),
    );
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Lead not found');
      throw new UnprocessableEntityException(result.error.message);
    }
    return result.value;
  }

  @Post(':id/assign')
  @RequirePermission('lead:write')
  async assignLead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(AssignLeadSchema)) dto: AssignLeadDto,
  ) {
    const result = await this.leadService.assignLead(
      new AssignLeadCommand(id, workspace.id, user.id, dto.targetWorkspaceUserId, dto.routingReason),
    );
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Lead not found');
      throw new UnprocessableEntityException(result.error.message);
    }
    return result.value;
  }

  @Get(':id/events')
  @RequirePermission('lead:read')
  async getLeadEvents(
    @Param('id') id: string,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ) {
    const result = await this.leadService.getLeadEvents(id, workspace.id);
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Lead not found');
      throw new NotFoundException('Lead not found');
    }
    return result.value;
  }

  @Post(':id/reactivate')
  @RequirePermission('lead:write')
  async reactivateLead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ) {
    const result = await this.leadService.reactivateLead(
      new ReactivateLeadCommand(id, workspace.id, user.id),
    );
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Lead not found');
      throw new UnprocessableEntityException(result.error.message);
    }
    return result.value;
  }
}
