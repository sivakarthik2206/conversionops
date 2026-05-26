import { signToken, verifyToken, decodeToken } from '../jwt';
import type { JWTPayload } from '../jwt';

const TEST_SECRET = 'a'.repeat(64); // 64-char secret meets production minimum
const VALID_PAYLOAD: JWTPayload = {
  userId: 'user-123',
  workspaceId: 'ws-456',
  role: 'AGENT',
};

describe('JWT — signToken / verifyToken round-trip', () => {
  it('signs and verifies a token successfully', () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1h');
    const result = verifyToken(token, TEST_SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.userId).toBe(VALID_PAYLOAD.userId);
      expect(result.value.workspaceId).toBe(VALID_PAYLOAD.workspaceId);
      expect(result.value.role).toBe(VALID_PAYLOAD.role);
    }
  });

  it('preserves all payload fields after round-trip', () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '7d');
    const result = verifyToken(token, TEST_SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.userId).toBe('user-123');
      expect(result.value.workspaceId).toBe('ws-456');
      expect(result.value.role).toBe('AGENT');
    }
  });

  it('includes iat (issued-at) in signed token', () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1h');
    const result = verifyToken(token, TEST_SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.iat).toBeDefined();
      expect(typeof result.value.iat).toBe('number');
    }
  });

  it('includes exp (expiry) in signed token', () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1h');
    const result = verifyToken(token, TEST_SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.exp).toBeDefined();
      expect(typeof result.value.exp).toBe('number');
    }
  });

  it('exp is roughly 1 hour from iat for 1h token', () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1h');
    const result = verifyToken(token, TEST_SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const diff = (result.value.exp ?? 0) - (result.value.iat ?? 0);
      expect(diff).toBe(3600);
    }
  });

  it('returns err for expired token (1ms expiry)', async () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1ms');
    await new Promise(resolve => setTimeout(resolve, 10));
    const result = verifyToken(token, TEST_SECRET);
    expect(result.ok).toBe(false);
  });

  it('returns err for wrong secret', () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1h');
    const wrongSecret = 'b'.repeat(64);
    const result = verifyToken(token, wrongSecret);
    expect(result.ok).toBe(false);
  });

  it('returns err for malformed token string', () => {
    const result = verifyToken('not.a.valid.jwt', TEST_SECRET);
    expect(result.ok).toBe(false);
  });

  it('returns err for completely invalid string', () => {
    const result = verifyToken('', TEST_SECRET);
    expect(result.ok).toBe(false);
  });

  it('returns err for tampered token payload', () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1h');
    // Tamper with the payload section (second part of JWT)
    const parts = token.split('.');
    if (parts.length === 3) {
      const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'hacker', role: 'OWNER' })).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      const result = verifyToken(tamperedToken, TEST_SECRET);
      expect(result.ok).toBe(false);
    }
  });

  it('never throws — always returns Result<T>', () => {
    expect(() => verifyToken('garbage', TEST_SECRET)).not.toThrow();
    expect(() => verifyToken('', TEST_SECRET)).not.toThrow();
    expect(() => verifyToken('a.b.c', TEST_SECRET)).not.toThrow();
  });
});

describe('JWT — decodeToken (no signature verification)', () => {
  it('decodes a valid token without verification', () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1h');
    const decoded = decodeToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe('user-123');
  });

  it('returns null for malformed token', () => {
    expect(decodeToken('not-a-jwt')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeToken('')).toBeNull();
  });

  it('does NOT verify signature (decodes expired token)', async () => {
    const token = signToken(VALID_PAYLOAD, TEST_SECRET, '1ms');
    await new Promise(resolve => setTimeout(resolve, 10));
    const decoded = decodeToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe('user-123');
  });
});
