import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function keyBuffer(key: string): Buffer {
  const buf = Buffer.from(key, 'hex');
  if (buf.length !== 32) throw new Error('INTEGRATION_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  return buf;
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Returns base64-encoded IV (12 bytes) + auth tag (16 bytes) + ciphertext.
 */
export function encrypt(plaintext: string, key: string): string {
  const keyBuf = keyBuffer(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a value produced by encrypt().
 */
export function decrypt(encryptedB64: string, key: string): string {
  const keyBuf = keyBuffer(key);
  const data = Buffer.from(encryptedB64, 'base64');
  const iv = data.subarray(0, IV_BYTES);
  const tag = data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = data.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Masks a secret for display: first 4 chars + bullets + last 4 chars.
 * Returns the original value unchanged if it is shorter than 12 characters.
 */
export function maskSecret(value: string): string {
  if (value.length < 12) return '••••••••';
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}
