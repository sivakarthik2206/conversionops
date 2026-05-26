import { generateMagicLinkToken, verifyMagicLinkToken } from '../magic-link';

const TEST_SECRET = 'magic_secret_'.repeat(6); // 78 chars, strong enough
const TEST_EMAIL = 'agent@brokerage.com';

describe('Magic Link — generateMagicLinkToken / verifyMagicLinkToken', () => {
  describe('valid token round-trip', () => {
    it('verifies a freshly generated token', () => {
      const token = generateMagicLinkToken(TEST_EMAIL, TEST_SECRET);
      const result = verifyMagicLinkToken(token, TEST_SECRET);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe(TEST_EMAIL);
      }
    });

    it('preserves the email exactly through encode/decode', () => {
      const email = 'UPPERCASE@Example.com';
      const token = generateMagicLinkToken(email, TEST_SECRET);
      const result = verifyMagicLinkToken(token, TEST_SECRET);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe(email);
      }
    });

    it('generates a non-empty base64url token', () => {
      const token = generateMagicLinkToken(TEST_EMAIL, TEST_SECRET);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(32);
    });

    it('generates unique tokens for the same email (random nonce)', () => {
      const token1 = generateMagicLinkToken(TEST_EMAIL, TEST_SECRET);
      const token2 = generateMagicLinkToken(TEST_EMAIL, TEST_SECRET);
      expect(token1).not.toBe(token2);
    });
  });

  describe('expired token rejection', () => {
    it('rejects a token after TTL expires', async () => {
      // We cannot easily expire a real 15min token in a test, but we can
      // test that the expiry mechanism works by manipulating the token directly.
      // Construct a token with a past expiresAt
      const email = TEST_EMAIL;
      const expiresAt = Date.now() - 1000; // 1 second in the past
      const nonce = 'deadbeef'.repeat(4); // 32 chars
      const payload = `${email}:${expiresAt}:${nonce}`;
      const { createHmac } = await import('crypto');
      const sig = createHmac('sha256', TEST_SECRET).update(payload).digest('hex');
      const raw = `${payload}:${sig}`;
      const token = Buffer.from(raw).toString('base64url');

      const result = verifyMagicLinkToken(token, TEST_SECRET);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/expired/i);
      }
    });
  });

  describe('tampered token rejection', () => {
    it('rejects a token with modified email', () => {
      const token = generateMagicLinkToken(TEST_EMAIL, TEST_SECRET);
      const raw = Buffer.from(token, 'base64url').toString('utf-8');
      // Replace the email part
      const tampered = raw.replace(TEST_EMAIL, 'hacker@evil.com');
      const tamperedToken = Buffer.from(tampered).toString('base64url');

      const result = verifyMagicLinkToken(tamperedToken, TEST_SECRET);
      expect(result.ok).toBe(false);
    });

    it('rejects completely invalid base64 garbage', () => {
      const result = verifyMagicLinkToken('not_a_valid_token_!!!', TEST_SECRET);
      expect(result.ok).toBe(false);
    });

    it('rejects empty string', () => {
      const result = verifyMagicLinkToken('', TEST_SECRET);
      expect(result.ok).toBe(false);
    });

    it('rejects token verified with wrong secret', () => {
      const token = generateMagicLinkToken(TEST_EMAIL, TEST_SECRET);
      const wrongSecret = 'wrong_secret_'.repeat(6);
      const result = verifyMagicLinkToken(token, wrongSecret);
      expect(result.ok).toBe(false);
    });

    it('rejects token with extra parts (malformed structure)', () => {
      const raw = Buffer.from('a:b:c:d:e').toString('base64url');
      const result = verifyMagicLinkToken(raw, TEST_SECRET);
      expect(result.ok).toBe(false);
    });
  });

  describe('never throws', () => {
    it('does not throw for any input', () => {
      expect(() => verifyMagicLinkToken('', TEST_SECRET)).not.toThrow();
      expect(() => verifyMagicLinkToken('garbage!!', TEST_SECRET)).not.toThrow();
      expect(() => verifyMagicLinkToken('a.b.c', TEST_SECRET)).not.toThrow();
    });
  });
});
