type RetryDecision = boolean | { retry: boolean; delayMs?: number };

type RetryOptions = {
  maxRetries: number;
  baseDelayMs: number;
  shouldRetry?: (error: unknown) => RetryDecision;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, shouldRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;

      if (shouldRetry) {
        const decision = shouldRetry(error);
        if (decision === false) break;
        if (typeof decision === 'object' && !decision.retry) break;

        const customDelay = typeof decision === 'object' ? decision.delayMs : undefined;
        await sleep(customDelay ?? baseDelayMs * Math.pow(2, attempt));
      } else {
        await sleep(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}
