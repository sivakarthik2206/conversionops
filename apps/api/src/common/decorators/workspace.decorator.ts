import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedWorkspace {
  id: string;
  slug: string;
}

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedWorkspace => {
    const request = ctx.switchToHttp().getRequest<Request & { workspace: AuthenticatedWorkspace }>();
    return request.workspace;
  },
);
