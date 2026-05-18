import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import type { AuthenticatedRequest } from '../guards/auth.guard';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const requestId = uuidv4();
    (req as Request & { requestId: string }).requestId = requestId;

    res.on('finish', () => {
      const userId = authReq.user?.id;
      const workspaceId = authReq.workspaceId;
      if (!userId || !workspaceId) return;

      queues.auditLog
        .add(
          'http-request',
          {
            userId,
            workspaceId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            ip: req.ip ?? req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            requestId,
          },
          { removeOnComplete: 1000, removeOnFail: 500 },
        )
        .catch((err: unknown) => {
          logger.error({ err }, 'Failed to enqueue audit log');
        });
    });

    next();
  }
}
