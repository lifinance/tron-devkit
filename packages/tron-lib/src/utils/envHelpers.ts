/**
 * Environment variable helpers for Tron scripts.
 */

/**
 * Get a required environment variable or throw.
 */
export function getEnvVar(varName: string): string {
  const value = process.env[varName]
  if (!value)
    throw new Error(`Missing required environment variable: ${varName}`)
  return value
}

/**
 * Build the RPC env var name for a given network.
 * Uses `RPC_URL_<NETWORK>` pattern (e.g. 'tron' -> 'RPC_URL_TRON').
 */
export function getRPCEnvVarName(networkName: string): string {
  return `RPC_URL_${networkName.toUpperCase().replace(/-/g, '_')}`
}

/** Default RPC URLs for Tron networks (TronGrid public endpoints). */
const DEFAULT_RPC_URLS: Record<string, string> = {
  tron: 'https://api.trongrid.io',
  tronshasta: 'https://api.shasta.trongrid.io',
}

/**
 * Get the RPC URL for a Tron network.
 * Priority: override (CLI flag) > env var > TronGrid default.
 * @param networkName - Network name (e.g. 'tron', 'tronshasta')
 * @param override - Optional RPC URL passed via CLI flag (e.g. --rpc-url)
 */
export function getTronRpcUrl(networkName: string, override?: string): string {
  const trimmed = override?.trim()
  if (trimmed) return trimmed

  const key = networkName.toLowerCase()
  const envVarName = getRPCEnvVarName(key)
  const envValue = process.env[envVarName]?.trim()
  if (envValue) return envValue

  const fallback = DEFAULT_RPC_URLS[key]
  if (fallback) return fallback

  throw new Error(
    `No RPC URL for network "${networkName}". Pass --rpc-url <url>, set ${envVarName}, or use a known network (tron, tronshasta).`
  )
}

/**
 * Get the private key. Checks the explicit override first, then PRIVATE_KEY env var.
 * @param override - Optional private key passed via CLI flag (e.g. --private-key)
 */
export function getPrivateKey(override?: string): string {
  const pk = override?.trim() || process.env.PRIVATE_KEY?.trim()
  if (!pk)
    throw new Error(
      'No private key provided. Pass --private-key <key> or set PRIVATE_KEY env var.'
    )
  return pk
}
