import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { verifyToken } from '@conversionops/auth';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedUser } from '../decorators/user.decorator';
import type { AuthenticatedWorkspace } from '../decorators/workspace.decorator';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  workspace: AuthenticatedWorkspace;
  workspaceId: string;
  userRole: string;
}

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
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const secret = process.env['JWT_SECRET'];
    if (!secret) throw new UnauthorizedException('JWT configuration error');

    const result = verifyToken(token, secret);
    if (!result.ok) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { userId, workspaceId, role } = result.value;

    const workspaceUser = await this.prisma.workspaceUser.findFirst({
      where: { userId, workspaceId, isActive: true, deletedAt: null },
      include: {
        user: { select: { id: true, email: true } },
        workspace: { select: { id: true, slug: true } },
      },
    });

    if (!workspaceUser) {
      throw new UnauthorizedException('Access revoked or workspace not found');
    }

    request.user = { id: userId, email: workspaceUser.user.email };
    request.workspace = { id: workspaceId, slug: workspaceUser.workspace.slug };
    request.workspaceId = workspaceId;
    request.userRole = role;

    return true;
  }
}
