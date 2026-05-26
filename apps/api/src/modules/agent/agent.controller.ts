import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AgentService } from './agent.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/user.decorator';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TenantLeakageError } from '@conversionops/sdk-standards';

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']),
  displayName: z.string().optional(),
});

const UpdateSchema = z.object({
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']).optional(),
  displayName: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
  isAvailable: z.boolean().optional(),
  unavailableUntil: z.string().datetime().optional().nullable(),
  specializations: z.array(z.string().max(60)).max(10).optional(),
  languages: z.array(z.string().max(20)).max(10).optional(),
  serviceAreas: z.array(z.string().max(80)).max(20).optional(),
  notifyOnNewLead: z.boolean().optional(),
  notifyOnHotLead: z.boolean().optional(),
  notifyOnEscalation: z.boolean().optional(),
});

const NotificationPrefsSchema = z.object({
  notifyOnNewLead: z.boolean().optional(),
  notifyOnHotLead: z.boolean().optional(),
  notifyOnEscalation: z.boolean().optional(),
});

type InviteDto = z.infer<typeof InviteSchema>;
type UpdateDto = z.infer<typeof UpdateSchema>;
type NotificationPrefsDto = z.infer<typeof NotificationPrefsSchema>;

@Controller('agents')
@UseGuards(AuthGuard, RbacGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  @RequirePermission('agent:read')
  async listAgents(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    const result = await this.agentService.listAgents(workspace.id);
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return result.value;
  }

  @Post('invite')
  @RequirePermission('agent:write')
  async inviteAgent(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(InviteSchema)) dto: InviteDto,
  ) {
    const result = await this.agentService.inviteAgent({
      workspaceId: workspace.id,
      invitedByUserId: user.id,
      email: dto.email,
      role: dto.role,
      displayName: dto.displayName,
    });
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return result.value;
  }

  @Get('me/notification-prefs')
  async getMyNotificationPrefs(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ) {
    const result = await this.agentService.getMyWorkspaceUserId(user.id, workspace.id);
    if (!result.ok) throw new NotFoundException('Agent record not found');
    const prefs = await this.agentService.getNotificationPrefs(result.value, workspace.id);
    if (!prefs.ok) throw new NotFoundException('Agent record not found');
    return prefs.value;
  }

  @Patch('me/notification-prefs')
  async updateMyNotificationPrefs(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(NotificationPrefsSchema)) dto: NotificationPrefsDto,
  ) {
    const result = await this.agentService.getMyWorkspaceUserId(user.id, workspace.id);
    if (!result.ok) throw new NotFoundException('Agent record not found');
    const updated = await this.agentService.updateNotificationPrefs(result.value, workspace.id, dto);
    if (!updated.ok) throw new UnprocessableEntityException(updated.error.message);
    return updated.value;
  }

  @Patch(':id')
  @RequirePermission('agent:write')
  async updateAgent(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(UpdateSchema)) dto: UpdateDto,
  ) {
    const result = await this.agentService.updateAgent({
      workspaceUserId: id,
      workspaceId: workspace.id,
      updatedByUserId: user.id,
      ...dto,
      unavailableUntil: dto.unavailableUntil === null ? null : dto.unavailableUntil ? new Date(dto.unavailableUntil) : undefined,
    });
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Agent not found');
      throw new UnprocessableEntityException(result.error.message);
    }
    return result.value;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('agent:suspend')
  async deleteAgent(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ): Promise<void> {
    const result = await this.agentService.deleteAgent(id, workspace.id, user.id);
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Agent not found');
      throw new UnprocessableEntityException(result.error.message);
    }
  }
}
