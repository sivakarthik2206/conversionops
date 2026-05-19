import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Validates requests to admin endpoints using ADMIN_API_KEY header.
 * Deploy admin endpoints behind VPN or IP allowlist in production.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const adminKey = process.env['ADMIN_API_KEY'];
    if (!adminKey) {
      throw new UnauthorizedException('Admin API not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-admin-api-key'];

    if (providedKey !== adminKey) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }
}
