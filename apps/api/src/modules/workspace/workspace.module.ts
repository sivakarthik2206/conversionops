import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceHandler } from './commands/create-workspace.handler';
import { UpdateWorkspaceHandler } from './commands/update-workspace.handler';
import { PauseAIHandler } from './commands/pause-ai.handler';
import { ResumeAIHandler } from './commands/resume-ai.handler';
import { GetWorkspaceHandler } from './queries/get-workspace.handler';

@Module({
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    CreateWorkspaceHandler,
    UpdateWorkspaceHandler,
    PauseAIHandler,
    ResumeAIHandler,
    GetWorkspaceHandler,
  ],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
