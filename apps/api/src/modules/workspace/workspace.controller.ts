import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { WorkspaceService } from './workspace.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWorkspaceCommand } from './commands/update-workspace.command';
import { PauseAICommand } from './commands/pause-ai.handler';
import { ResumeAICommand } from './commands/resume-ai.handler';
import { WorkspaceDto, WorkspaceHealthDto } from './queries/get-workspace.query';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/user.decorator';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const E164_RE = /^\+[1-9]\d{10,14}$/;

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  twilioNumber: z.string().regex(E164_RE, 'Must be E.164 format, e.g. +19125550550').optional(),
  followUpBossApiKey: z.string().max(256).optional(),
  calComUsername: z.string().max(128).optional(),
  calComLink: z.string().max(512).optional(),
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
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly prisma: PrismaService,
  ) {}

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
      new UpdateWorkspaceCommand(workspace.id, user.id, {
        name: dto.name,
        timezone: dto.timezone,
        twilioNumber: dto.twilioNumber,
        followUpBossApiKey: dto.followUpBossApiKey,
        calComUsername: dto.calComUsername,
        calComLink: dto.calComLink,
      }),
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
  ): Promise<WorkspaceHealthDto> {
    const [totalLeads, qualifiedLeads, appointmentsBooked, messages] = await Promise.all([
      this.prisma.lead.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
      this.prisma.lead.count({ where: { workspaceId: workspace.id, deletedAt: null, tier: { in: ['HOT', 'PRIORITY', 'WARM'] } } }),
      this.prisma.appointment.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
      this.prisma.message.findMany({
        where: { workspaceId: workspace.id, role: 'AI' },
        select: { createdAt: true, conversation: { select: { createdAt: true } } },
        take: 200,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const qualifiedRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100 * 10) / 10 : 0;

    let avgResponseMs = 0;
    if (messages.length > 0) {
      const responseTimes = messages
        .map(m => new Date(m.createdAt).getTime() - new Date(m.conversation.createdAt).getTime())
        .filter(t => t > 0 && t < 300_000);
      if (responseTimes.length > 0) {
        avgResponseMs = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      }
    }

    return { totalLeads, qualifiedRate, appointmentsBooked, avgResponseMs };
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

  @Get('me/audit-log')
  @RequirePermission('settings:read')
  async getAuditLog(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('limit') limitStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '50', 10), 200);
    const entries = await this.prisma.auditLog.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        ...(action ? { action } : {}),
        ...(resource ? { resource } : {}),
      },
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });

    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, -1) : entries;
    return { items, nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null };
  }
}
