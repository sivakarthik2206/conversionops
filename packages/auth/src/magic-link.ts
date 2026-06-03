import { createHmac, randomBytes } from 'crypto';
import { Result } from '@conversionops/types';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes

function buildPayload(email: string, expiresAt: number, nonce: string): string {
  return `${email}:${expiresAt}:${nonce}`;
}

function hmacSign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Generates a time-limited HMAC magic-link token for the given email.
 * @param email - Recipient email address
 * @param secret - HMAC secret from MAGIC_LINK_SECRET env var
 * @returns Opaque token to embed in the magic link URL
 */
export function generateMagicLinkToken(email: string, secret: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const nonce = randomBytes(16).toString('hex');
  const payload = buildPayload(email, expiresAt, nonce);
  const signature = hmacSign(payload, secret);
  const raw = `${payload}:${signature}`;
  return Buffer.from(raw).toString('base64url');
}

/**
 * Verifies a magic-link token and returns the embedded email if valid.
 * @param token - Token received from the magic link URL
 * @param secret - HMAC secret from MAGIC_LINK_SECRET env var
 * @returns Result<{ email: string }> — never throws
 */
export function verifyMagicLinkToken(token: string, secret: string): Result<{ email: string }> {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length !== 4) {
      return { ok: false, error: new Error('Invalid token format') };
    }

    const [email, expiresAtStr, nonce, signature] = parts as [string, string, string, string];
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { ok: false, error: new Error('Token expired') };
    }

    const payload = buildPayload(email, expiresAt, nonce);
    const expectedSignature = hmacSign(payload, secret);

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return { ok: false, error: new Error('Invalid token signature') };
    }

    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    if (mismatch !== 0) {
      return { ok: false, error: new Error('Invalid token signature') };
    }

    return { ok: true, value: { email } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
