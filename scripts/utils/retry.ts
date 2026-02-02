export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Don't retry 4xx errors (client errors)
      if (error instanceof Error && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status >= 400 && status < 500) throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      console.log(`  Retry ${attempt + 1}/${maxRetries} in ${Math.round(jitter)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error('Retry exhausted');
}
