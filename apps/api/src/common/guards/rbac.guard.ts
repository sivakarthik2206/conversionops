import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, UserRole } from '@conversionops/auth';
import { logger } from '@conversionops/observability';
import type { Permission } from '@conversionops/auth';
import type { AuthenticatedRequest } from './auth.guard';

export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: Permission): MethodDecorator =>
  SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.userRole as UserRole;

    if (!role || !hasPermission(role, required)) {
      logger.warn(
        { userId: request.user?.id, workspaceId: request.workspaceId, role, required },
        'RBAC permission denied',
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
