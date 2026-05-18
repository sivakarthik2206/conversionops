xport async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    backoffMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const { attempts = 3, backoffMs = 500, onRetry } = options;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === attempts) throw error;
      onRetry?.(attempt, error as Error);
      await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("unreachable");
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
