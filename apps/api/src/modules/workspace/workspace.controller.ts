import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { WorkspaceService } from './workspace.service';
import { UpdateWorkspaceCommand } from './commands/update-workspace.command';
import { PauseAICommand } from './commands/pause-ai.handler';
import { ResumeAICommand } from './commands/resume-ai.handler';
import { WorkspaceDto } from './queries/get-workspace.query';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/user.decorator';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
});

const UpdateAiConfigSchema = z.object({
  aiConfig: z.record(z.unknown()),
});

const PauseAISchema = z.object({
  reason: z.string().optional(),
});

type UpdateWorkspaceDto = z.infer<typeof UpdateWorkspaceSchema>;
type UpdateAiConfigDto = z.infer<typeof UpdateAiConfigSchema>;
type PauseAIDto = z.infer<typeof PauseAISchema>;

@Controller('workspaces')
@UseGuards(AuthGuard, RbacGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get('me')
  @RequirePermission('settings:read')
  async getMyWorkspace(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ): Promise<WorkspaceDto> {
    const result = await this.workspaceService.getWorkspace(workspace.id);
    if (!result.ok) throw new NotFoundException('Workspace not found');
    return result.value;
  }

  @Patch('me')
  @RequirePermission('settings:write')
  async updateMyWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(UpdateWorkspaceSchema)) dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceDto> {
    const result = await this.workspaceService.updateWorkspace(
      new UpdateWorkspaceCommand(workspace.id, user.id, dto),
    );
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return this.workspaceService.getWorkspace(workspace.id).then((r) => {
      if (!r.ok) throw new NotFoundException();
      return r.value;
    });
  }

  @Get('me/health')
  @RequirePermission('settings:read')
  async getHealth(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ): Promise<WorkspaceDto> {
    const result = await this.workspaceService.getWorkspace(workspace.id);
    if (!result.ok) throw new NotFoundException('Workspace not found');
    return result.value;
  }

  @Patch('me/ai-config')
  @RequirePermission('agent:write')
  async updateAiConfig(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(UpdateAiConfigSchema)) dto: UpdateAiConfigDto,
  ): Promise<{ ok: boolean }> {
    const result = await this.workspaceService.updateWorkspace(
      new UpdateWorkspaceCommand(workspace.id, user.id, { aiConfig: dto.aiConfig }),
    );
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return { ok: true };
  }

  @Post('me/ai/pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('agent:suspend')
  async pauseAI(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(PauseAISchema)) dto: PauseAIDto,
  ): Promise<void> {
    await this.workspaceService.pauseAI(new PauseAICommand(workspace.id, user.id, dto.reason));
  }

  @Post('me/ai/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('agent:suspend')
  async resumeAI(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ): Promise<void> {
    await this.workspaceService.resumeAI(new ResumeAICommand(workspace.id, user.id));
  }
}
