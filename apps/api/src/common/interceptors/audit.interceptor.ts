import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import type { AuthenticatedRequest } from '../guards/auth.guard';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    const workspaceId = request.workspaceId;
    const userId = request.user?.id;

    return next.handle().pipe(
      tap(() => {
        if (!workspaceId || !userId) return;

        const action = `${request.method.toLowerCase()}:${request.path.replace(/\/[a-z0-9]{20,}/gi, '/:id')}`;

        queues.auditLog
          .add(
            'audit',
            {
              workspaceId,
              actorId: userId,
              action,
              resourceType: resolveResourceType(request.path),
              metadata: { method: request.method, path: request.path },
            },
            { removeOnComplete: 1000 },
          )
          .catch((err) => {
            logger.error({ err, workspaceId, action }, 'Failed to enqueue audit log');
          });
      }),
    );
  }
}

function resolveResourceType(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const resource = segments[1];
  return resource ?? 'unknown';
}
