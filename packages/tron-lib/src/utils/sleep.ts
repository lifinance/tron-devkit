/**
 * Sleeps for the specified duration.
 * @param ms - Duration in milliseconds (default: 500ms)
 */
export function sleep(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
