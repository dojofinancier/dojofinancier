/**
 * Retry utility with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Promise that resolves with the function result or rejects after max retries
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryable?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryable: () => true, // Retry all errors by default
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * Retry a function with exponential backoff
 * 
 * @example
 * ```ts
 * const result = await retry(
 *   () => fetchData(),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!opts.retryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, opts);
      
      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Retry a function with exponential backoff and custom retry condition
 * 
 * @example
 * ```ts
 * const result = await retryIf(
 *   () => apiCall(),
 *   (error) => error.statusCode === 429 || error.statusCode >= 500,
 *   { maxRetries: 5 }
 * );
 * ```
 */
export async function retryIf<T>(
  fn: () => Promise<T>,
  condition: (error: any) => boolean,
  options: Omit<RetryOptions, "retryable"> = {}
): Promise<T> {
  return retry(fn, {
    ...options,
    retryable: condition,
  });
}

/**
 * Retry a function only for network errors
 */
export async function retryOnNetworkError<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, "retryable"> = {}
): Promise<T> {
  return retry(fn, {
    ...options,
    retryable: (error) => {
      // Retry on network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return true;
      }
      // Retry on 5xx server errors
      if (error?.statusCode >= 500 && error?.statusCode < 600) {
        return true;
      }
      // Retry on 429 Too Many Requests
      if (error?.statusCode === 429) {
        return true;
      }
      return false;
    },
  });
}

