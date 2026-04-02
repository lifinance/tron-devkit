/**
 * TronWeb initialization and low-level Tron utilities for troncast scripts.
 */

/* eslint-disable import/first */
declare global {
  // eslint-disable-next-line no-var
  var proto: Record<string, unknown>
}

if (
  typeof globalThis !== 'undefined' &&
  typeof globalThis.proto === 'undefined'
)
  globalThis.proto = {}

import { consola } from 'consola'
import { TronWeb } from 'tronweb'

import { getTronRpcUrl } from '../../utils/envHelpers'
import { sleep } from '../../utils/sleep'
import type { Environment } from '../types'
/* eslint-enable import/first */

/**
 * Creates a TronWeb instance for the given environment.
 * Uses `RPC_URL_TRON` / `RPC_URL_TRONSHASTA` with TronGrid fallback.
 */
export function initTronWeb(
  env: Environment,
  privateKey?: string,
  rpcUrl?: string
): TronWeb {
  if (!rpcUrl) {
    const networkName = env === 'mainnet' ? 'tron' : 'tronshasta'
    rpcUrl = getTronRpcUrl(networkName)
  }

  consola.debug(`Initializing TronWeb with ${env} network: ${rpcUrl}`)

  const tronWeb = new TronWeb({
    fullHost: rpcUrl,
    privateKey: privateKey || undefined,
  })

  if (!privateKey)
    tronWeb.setAddress('T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb')

  return tronWeb
}

/**
 * Parses a human-readable Tron value string to SUN.
 * Accepts `"<n>tron"`, `"<n>sun"`, or a bare integer string.
 */
export function parseValue(value: string): string {
  if (value.endsWith('tron')) {
    const amount = parseFloat(value.replace('tron', ''))
    return (amount * 1_000_000).toString()
  } else if (value.endsWith('sun')) return value.replace('sun', '')

  return value
}

/**
 * Polls `getTransactionInfo` until the transaction is confirmed or timeout.
 */
export async function waitForConfirmation(
  tronWeb: TronWeb,
  txId: string,
  timeout = 60000
): Promise<unknown> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await tronWeb.trx.getTransactionInfo(txId)
      if (receipt && receipt.id) return receipt
    } catch (error) {
      // Transaction not yet confirmed
    }
    await sleep(2000)
  }

  throw new Error(`Transaction ${txId} not confirmed within ${timeout}ms`)
}
