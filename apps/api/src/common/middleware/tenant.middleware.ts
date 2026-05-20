import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { verifyToken } from '@conversionops/auth';
import { logger } from '@conversionops/observability';
import type { AuthenticatedRequest } from '../guards/auth.guard';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const secret = process.env['JWT_SECRET'];

      if (secret) {
        const result = verifyToken(token, secret);
        if (result.ok) {
          req.workspaceId = result.value.workspaceId;
          req.userRole = result.value.role;
          logger.debug(
            { workspaceId: req.workspaceId, path: req.path },
            'TenantMiddleware: workspace attached',
          );
        }
      }
    }

    next();
  }
}
