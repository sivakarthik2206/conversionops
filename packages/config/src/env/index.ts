/**
 * Typed environment variable accessors.
 * All access is lazy (read at call time, not module load) so that
 * tests can set process.env before importing modules.
 */

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function getOptionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

/** Returns true only in production (NODE_ENV=production). */
export function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/** Returns true in test environment (NODE_ENV=test or JEST_WORKER_ID set). */
export function isTest(): boolean {
  return process.env['NODE_ENV'] === 'test' || process.env['JEST_WORKER_ID'] !== undefined;
}

/**
 * Validates that all required environment variables are present.
 * Call this once at application bootstrap — throws if any are missing.
 */
export function validateRequiredEnvVars(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
