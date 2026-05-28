import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { verifyToken, type JWTPayload } from '@conversionops/auth';
import { logger } from '@conversionops/observability';
import { safeEquals } from '../../common/security/timing-safe';

/**
 * Gate for the internal ops console. Accepts EITHER:
 *   1. an `x-admin-api-key` header matching ADMIN_API_KEY (timing-safe), or
 *   2. an `Authorization: Bearer <jwt>` whose payload has role === 'ADMIN'.
 *
 * The api-key path is what the static ops-console app uses (it ships the key as
 * NEXT_PUBLIC_ADMIN_API_KEY behind a VPN / IP allowlist). The JWT path lets a
 * future admin login issue short-lived ADMIN tokens without backend changes.
 *
 * Fails closed: any misconfiguration or invalid credential results in 401.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // ── Path 1: shared admin API key (constant-time comparison) ──
    const apiKeyHeader = request.headers['x-admin-api-key'];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    if (apiKey) {
      const expected = process.env['ADMIN_API_KEY'];
      if (!expected) {
        logger.error('AdminGuard: ADMIN_API_KEY not configured — refusing api-key auth');
        throw new UnauthorizedException('Server misconfiguration');
      }
      if (safeEquals(apiKey, expected)) return true;
      throw new UnauthorizedException('Invalid admin API key');
    }

    // ── Path 2: ADMIN-role JWT ──
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing admin credentials');
    }

    const token = authHeader.slice(7).trim();
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
