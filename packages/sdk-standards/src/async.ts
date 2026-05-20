export interface RetryOptions {
  attempts?: number;
  backoffMs?: number;
  maxJitter?: number;
}

/**
 * Retries an async function with exponential backoff.
 * Accepts either `(fn, attempts)` or `(fn, options)` calling conventions.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attemptsOrOptions: number | RetryOptions = 3,
): Promise<T> {
  const opts: RetryOptions = typeof attemptsOrOptions === 'number'
    ? { attempts: attemptsOrOptions }
    : attemptsOrOptions;

  const { attempts = 3, backoffMs = 500, maxJitter = 200 } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        const delay = backoffMs * Math.pow(2, attempt) + Math.random() * maxJitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Executes a function and swallows any errors, returning undefined on failure.
 */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}
