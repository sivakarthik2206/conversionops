import { Injectable } from '@nestjs/common';
import { Result } from '@conversionops/types';
import type { Workspace } from '@conversionops/db';
import { CreateWorkspaceHandler } from './commands/create-workspace.handler';
import { CreateWorkspaceCommand } from './commands/create-workspace.command';
import { UpdateWorkspaceHandler } from './commands/update-workspace.handler';
import { UpdateWorkspaceCommand } from './commands/update-workspace.command';
import { PauseAIHandler, PauseAICommand } from './commands/pause-ai.handler';
import { ResumeAIHandler, ResumeAICommand } from './commands/resume-ai.handler';
import { GetWorkspaceHandler } from './queries/get-workspace.handler';
import { GetWorkspaceQuery, WorkspaceDto } from './queries/get-workspace.query';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly createHandler: CreateWorkspaceHandler,
    private readonly updateHandler: UpdateWorkspaceHandler,
    private readonly pauseAIHandler: PauseAIHandler,
    private readonly resumeAIHandler: ResumeAIHandler,
    private readonly getHandler: GetWorkspaceHandler,
  ) {}

  /** Creates a new workspace. */
  createWorkspace(cmd: CreateWorkspaceCommand): Promise<Result<Workspace>> {
    return this.createHandler.execute(cmd);
  }

  /** Returns workspace DTO with token usage and agent count. */
  getWorkspace(workspaceId: string): Promise<Result<WorkspaceDto>> {
    return this.getHandler.execute(new GetWorkspaceQuery(workspaceId));
  }

  /** Updates name, timezone, or aiConfig. */
  updateWorkspace(cmd: UpdateWorkspaceCommand): Promise<Result<Workspace>> {
    return this.updateHandler.execute(cmd);
  }

  /** Pauses AI for the workspace. */
  pauseAI(cmd: PauseAICommand): Promise<Result<Workspace>> {
    return this.pauseAIHandler.execute(cmd);
  }

  /** Resumes AI for the workspace. */
  resumeAI(cmd: ResumeAICommand): Promise<Result<Workspace>> {
    return this.resumeAIHandler.execute(cmd);
  }
}
