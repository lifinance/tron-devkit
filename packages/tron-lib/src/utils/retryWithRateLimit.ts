/**
 * Shared rate-limit utilities for Tron RPC calls.
 */

import { sleep } from './sleep'

/**
 * Check if an error is a rate limit error (429, rate limit, Too Many Requests).
 */
export function isRateLimitError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const patterns = ['429', 'rate limit', 'Too Many Requests']
  return patterns.some((pattern) =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  )
}

/**
 * Invokes an async function, retrying only on rate-limit-style errors.
 * @param fn - Async work to run
 * @param maxAttempts - Total attempts (must be >= 1)
 * @param retryDelayMs - Wait between retries
 * @param onRetry - Optional hook before sleeping (1-based attempt index, delay ms)
 */
export async function retryWithRateLimit<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  retryDelayMs: number,
  onRetry?: (attempt: number, delayMs: number) => void
): Promise<T> {
  if (maxAttempts < 1)
    throw new Error('retryWithRateLimit: maxAttempts must be at least 1')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const canRetry = isRateLimitError(error) && attempt < maxAttempts
      if (!canRetry) throw error
      onRetry?.(attempt, retryDelayMs)
      await sleep(retryDelayMs)
    }
  }

  throw new Error('retryWithRateLimit: exhausted attempts')
}
