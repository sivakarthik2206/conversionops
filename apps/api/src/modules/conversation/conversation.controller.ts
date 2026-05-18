import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ConversationService } from './conversation.service';
import { SendMessageCommand } from './commands/send-message.command';
import { TakeoverConversationCommand } from './commands/takeover-conversation.command';
import { ReleaseToAICommand } from './commands/release-to-ai.command';
import { EscalateConversationCommand } from './commands/escalate-conversation.command';
import { ListConversationsQuery } from './queries/list-conversations.query';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/user.decorator';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TenantLeakageError } from '@conversionops/sdk-standards';

const SendMessageSchema = z.object({ content: z.string().min(1) });
const TakeoverSchema = z.object({ reason: z.string().optional() });
const EscalateSchema = z.object({
  level: z.enum(['FLAGGED', 'ESCALATED', 'URGENT']),
  reason: z.string().optional(),
});

type SendMessageDto = z.infer<typeof SendMessageSchema>;
type TakeoverDto = z.infer<typeof TakeoverSchema>;
type EscalateDto = z.infer<typeof EscalateSchema>;

@Controller('conversations')
@UseGuards(AuthGuard, RbacGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  @RequirePermission('conversation:read')
  async listConversations(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('status') status?: string,
    @Query('aiActive') aiActiveStr?: string,
    @Query('assignedAgent') assignedAgent?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const aiActive = aiActiveStr !== undefined ? aiActiveStr === 'true' : undefined;
    const limit = limitStr ? Math.min(parseInt(limitStr, 10), 100) : 25;
    const result = await this.conversationService.listConversations(
      new ListConversationsQuery(workspace.id, status, aiActive, assignedAgent, cursor, limit),
    );
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return result.value;
  }

  @Get(':id')
  @RequirePermission('conversation:read')
  async getConversation(
    @Param('id') id: string,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ) {
    const result = await this.conversationService.getConversation(id, workspace.id);
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Conversation not found');
      throw new NotFoundException('Conversation not found');
    }
    return result.value;
  }

  @Post(':id/takeover')
  @RequirePermission('conversation:takeover')
  async takeover(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(TakeoverSchema)) dto: TakeoverDto,
  ) {
    const result = await this.conversationService.takeoverConversation(
      new TakeoverConversationCommand(id, workspace.id, user.id, dto.reason),
    );
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Conversation not found');
      throw new UnprocessableEntityException(result.error.message);
    }
    return result.value;
  }

  @Post(':id/release')
  @RequirePermission('conversation:write')
  async release(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ) {
    const result = await this.conversationService.releaseToAI(
      new ReleaseToAICommand(id, workspace.id, user.id),
    );
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Conversation not found');
      throw new UnprocessableEntityException(result.error.message);
    }
    return result.value;
  }

  @Post(':id/message')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('conversation:write')
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(SendMessageSchema)) dto: SendMessageDto,
  ) {
    const result = await this.conversationService.sendMessage(
      new SendMessageCommand(id, workspace.id, user.id, dto.content),
    );
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Conversation not found');
      throw new UnprocessableEntityException(result.error.message);
    }
    return result.value;
  }

  @Post(':id/escalate')
  @RequirePermission('conversation:write')
  async escalate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(EscalateSchema)) dto: EscalateDto,
  ) {
    const result = await this.conversationService.escalate(
      new EscalateConversationCommand(id, workspace.id, user.id, dto.level, dto.reason),
    );
    if (!result.ok) {
      if (result.error instanceof TenantLeakageError) throw new NotFoundException('Conversation not found');
      throw new UnprocessableEntityException(result.error.message);
    }
    return result.value;
  }
}
