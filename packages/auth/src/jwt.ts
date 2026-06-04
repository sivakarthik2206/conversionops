import jwt from 'jsonwebtoken';
import type { Result } from '@conversionops/types';

export interface JWTPayload {
  userId: string;
  workspaceId: string;
  role: string;
  plan?: string;
  status?: string;
  iat?: number;
  exp?: number;
}

/**
 * Signs a JWT payload with HS256 and returns the token string.
 * @param payload - User identity and workspace context
 * @param secret - JWT_SECRET from environment (min 64 chars)
 * @param expiry - Token lifetime (e.g. '7d', '1h')
 */
export function signToken(payload: JWTPayload, secret: string, expiry: string): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: expiry as jwt.SignOptions['expiresIn'] });
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Returns err on expired or malformed tokens — never throws.
 * @param token - Raw JWT string
 * @param secret - JWT_SECRET used to sign the token
 */
export function verifyToken(token: string, secret: string): Result<JWTPayload> {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
    return { ok: true, value: payload };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Decodes a JWT without signature verification. For logging only — never trust for auth.
 * @param token - Raw JWT string
 * @returns Decoded payload or null if malformed
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== 'object') return null;
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}
