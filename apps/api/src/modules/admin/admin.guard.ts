import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { verifyToken, type JWTPayload } from '@conversionops/auth';
import { logger } from '@conversionops/observability';

/**
 * Validates requests to admin endpoints using JWT with ADMIN role assertion.
 * Fails closed: any misconfiguration or invalid token results in 401.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException('Missing token');

    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      logger.error('AdminGuard: JWT_SECRET not configured — refusing all admin requests');
      throw new UnauthorizedException('Server misconfiguration');
    }

    const result = verifyToken(token, secret);
    if (!result.ok) {
      throw new UnauthorizedException('Invalid or expired admin JWT token');
    }

    if (result.value.role !== 'ADMIN') {
      throw new UnauthorizedException('Requires ADMIN role');
    }

    (request as Request & { user: JWTPayload }).user = result.value;
    return true;
  }
}
