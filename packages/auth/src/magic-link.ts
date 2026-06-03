import * as crypto from 'crypto';
import { ok, err } from '@conversionops/types';
import type { Result } from '@conversionops/types';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes

export function generateMagicLinkToken(email: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    email: email.toLowerCase().trim(),
    exp: Date.now() + TOKEN_TTL_MS,
    iat: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  })).toString('base64url');

  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${sig}`;
}

export function verifyMagicLinkToken(
  token: string,
  secret: string,
): Result<{ email: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return err(new Error('Invalid token format'));
    }

    const [payload, sig] = parts as [string, string];

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');

    const sigBuffer = Buffer.from(sig, 'base64url');
    const expectedBuffer = Buffer.from(expectedSig, 'base64url');

    if (sigBuffer.length !== expectedBuffer.length) {
      return err(new Error('Invalid token signature'));
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return err(new Error('Invalid token signature'));
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: string;
      exp?: number;
    };

    if (!data.exp || Date.now() > data.exp) {
      return err(new Error('Token expired'));
    }

    if (!data.email) {
      return err(new Error('Invalid token payload'));
    }

    return ok({ email: data.email });
  } catch (e) {
    return err(new Error(`Token parse error: ${e instanceof Error ? e.message : String(e)}`));
  }
}
