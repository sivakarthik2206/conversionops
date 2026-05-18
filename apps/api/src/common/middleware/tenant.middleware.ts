import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@conversionops/observability';
import type { AuthenticatedRequest } from '../guards/auth.guard';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const authReq = req as AuthenticatedRequest;
    const workspaceId = authReq.workspaceId;

    if (workspaceId) {
      (req as Request & { log: typeof logger }).log = logger.child({ workspaceId });
    }

    next();
  }
}
