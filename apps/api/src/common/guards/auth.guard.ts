import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { verifyToken } from '@conversionops/auth';
import { logger } from '@conversionops/observability';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedUser } from '../decorators/user.decorator';
import type { AuthenticatedWorkspace } from '../decorators/workspace.decorator';

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  workspace: AuthenticatedWorkspace;
  workspaceId: string;
  userRole: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing authentication token');

    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) throw new UnauthorizedException('Server misconfiguration');

    const result = verifyToken(token, jwtSecret);
    if (!result.ok) {
      logger.warn({ err: result.error.message }, 'JWT verification failed');
      throw new UnauthorizedException('Invalid or expired token');
    }

    const payload = result.value;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('Resource not found');
    }

    const workspaceUser = await this.prisma.workspaceUser.findFirst({
      where: { userId: user.id, isActive: true, deletedAt: null },
      select: {
        role: true,
        createdAt: true,
        workspace: {
          select: { id: true, slug: true, deletedAt: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!workspaceUser || workspaceUser.workspace.deletedAt) {
      throw new NotFoundException('Resource not found');
    }

    request.user = { id: user.id, email: user.email };
    request.workspace = {
      id: workspaceUser.workspace.id,
      slug: workspaceUser.workspace.slug,
    };
    request.workspaceId = workspaceUser.workspace.id;
    request.userRole = workspaceUser.role;

    return true;
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
