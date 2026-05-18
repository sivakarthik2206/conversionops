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
  displayName: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

type InviteDto = z.infer<typeof InviteSchema>;
type UpdateDto = z.infer<typeof UpdateSchema>;

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
