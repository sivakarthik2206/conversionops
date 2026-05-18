import jwt from 'jsonwebtoken';
import { Result } from '@conversionops/types';

export interface JWTPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Signs a JWT token with the given payload, secret, and expiry.
 * @param payload - User identity fields to embed
 * @param secret - HMAC secret (min 64 chars in production)
 * @param expiresIn - Expiry string e.g. '7d', '1h'
 * @returns Signed JWT string
 */
export function signToken(payload: JWTPayload, secret: string, expiresIn: string): string {
  return jwt.sign({ sub: payload.sub, email: payload.email }, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verifies and decodes a JWT token.
 * @param token - Raw JWT string
 * @param secret - HMAC secret used to sign the token
 * @returns Result<JWTPayload> — never throws
 */
export function verifyToken(token: string, secret: string): Result<JWTPayload> {
  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return { ok: true, value: decoded };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
