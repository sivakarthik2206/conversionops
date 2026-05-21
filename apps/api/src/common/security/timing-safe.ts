import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison for secrets / API keys / signatures.
 * Returns false on length mismatch (the length-leak is acceptable for API keys
 * of bounded size; the value comparison is what attackers can otherwise time).
 */
export function safeEquals(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
