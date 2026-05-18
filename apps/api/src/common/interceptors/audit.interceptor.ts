import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import type { AuthenticatedRequest } from '../guards/auth.guard';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          const userId = req.user?.id;
          const workspaceId = req.workspaceId;
          if (!userId || !workspaceId) return;

          let resourceId: string | undefined;
          if (
            responseBody !== null &&
            typeof responseBody === 'object' &&
            'id' in responseBody &&
            typeof (responseBody as Record<string, unknown>)['id'] === 'string'
          ) {
            resourceId = (responseBody as Record<string, unknown>)['id'] as string;
          }

          if (!resourceId) return;

          queues.auditLog
            .add(
              'resource-mutated',
              {
                userId,
                workspaceId,
                resourceId,
                method: req.method,
                path: req.path,
              },
              { removeOnComplete: 1000, removeOnFail: 500 },
            )
            .catch((err: unknown) => {
              logger.error({ err }, 'AuditInterceptor: failed to enqueue');
            });
        },
        error: () => {
          // Audit failure never affects the response
        },
      }),
    );
  }
}
