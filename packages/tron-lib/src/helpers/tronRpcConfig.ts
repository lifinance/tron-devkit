import { consola } from 'consola'

import { TRON_PRO_API_KEY_HEADER } from '../constants'
import { getEnvVar, getTronRpcUrl } from '../utils/envHelpers'

import { isTronGridRpcUrl } from './isTronGridRpcUrl'

/**
 * Get TronGrid API key.
 * Priority: override (CLI flag) > env var.
 * @param override - Optional API key passed via CLI flag (e.g. --trongrid-api-key)
 * @param verbose - Log debug info
 */
export function getTronGridAPIKey(override?: string, verbose = false): string | undefined {
  const trimmed = override?.trim()
  if (trimmed) {
    if (verbose)
      consola.debug('Using TronGrid API key from CLI override')
    return trimmed
  }

  const envVarName = 'TRONGRID_API_KEY'

  try {
    const apiKey = getEnvVar(envVarName)
    if (apiKey && apiKey.trim() !== '') {
      if (verbose)
        consola.debug(
          `Using TronGrid API key from environment variable: ${envVarName}`
        )
      return apiKey.trim()
    }
  } catch {
    // Continue to check process.env directly
  }

  const apiKey = process.env[envVarName]
  if (apiKey && apiKey.trim() !== '') {
    if (verbose)
      consola.debug(`Using TronGrid API key from process.env: ${envVarName}`)
    return apiKey.trim()
  }

  if (verbose)
    consola.debug('TronGrid API key not found in environment variables')

  return undefined
}

/**
 * JSON POST headers for Tron `wallet/*` HTTP APIs.
 * Merges TronGrid `TRON-PRO-API-KEY` when `fullHost` targets TronGrid.
 */
export function buildTronWalletJsonPostHeaders(
  fullHost: string,
  verbose = false
): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  }
  if (isTronGridRpcUrl(fullHost)) {
    const apiKey = getTronGridAPIKey(undefined, verbose)
    if (apiKey) headers[TRON_PRO_API_KEY_HEADER] = apiKey
    else if (verbose) {
      consola.warn(
        'Using TronGrid RPC but no API key found. ' +
          'Set TRONGRID_API_KEY in .env to avoid rate limiting.'
      )
    }
  }
  return headers
}

/**
 * Get Tron RPC URL and API key configuration.
 * Uses `RPC_URL_TRON` / `RPC_URL_TRONSHASTA` env vars with fallback to TronGrid defaults.
 */
export function getTronRPCConfig(
  networkName: string,
  verbose = false
): { rpcUrl: string; headers?: Record<string, string> } {
  const rpcUrl = getTronRpcUrl(networkName)
  if (verbose)
    consola.debug(`Using RPC URL for ${networkName}: ${rpcUrl}`)

  const isTronGrid = isTronGridRpcUrl(rpcUrl)
  let headers: Record<string, string> | undefined

  if (isTronGrid) {
    const apiKey = getTronGridAPIKey(undefined, verbose)
    if (apiKey) {
      headers = { [TRON_PRO_API_KEY_HEADER]: apiKey }
      if (verbose)
        consola.debug(
          `TronGrid API key will be set as header: ${TRON_PRO_API_KEY_HEADER}`
        )
    } else if (verbose) {
      consola.warn(
        'Using TronGrid RPC but no API key found. ' +
          'Set TRONGRID_API_KEY in .env to avoid rate limiting.'
      )
    }
  }

  return { rpcUrl, headers }
}
