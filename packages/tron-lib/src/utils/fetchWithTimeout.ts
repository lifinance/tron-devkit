/** Default timeout in ms for external API fetch calls (10 seconds). */
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000

/**
 * Performs fetch with a timeout using AbortController.
 * The timeout is cleared in a finally block so the timer is always released.
 */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
