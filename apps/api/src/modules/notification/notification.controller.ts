import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(AuthGuard, RbacGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('type') type?: string,
  ) {
    return this.notificationService.list(workspace.id, {
      limit: Math.min(limit, 100),
      offset,
      type,
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    const count = await this.notificationService.getUnreadCount(workspace.id);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Param('id') id: string,
  ) {
    await this.notificationService.markRead(workspace.id, id);
  }

  @Patch('read-all')
  async markAllRead(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    return this.notificationService.markAllRead(workspace.id);
  }
}
