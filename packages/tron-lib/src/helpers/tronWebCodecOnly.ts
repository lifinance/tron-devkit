import { TronWeb } from 'tronweb'

import { isTronNetworkKey } from '../utils/networkKeys'
import { getTronRpcUrl } from '../utils/envHelpers'

import { tronWebFullHostFromRpcUrl } from './tronJsonRpcForViem'

const tronWebCodecByNetwork = new Map<string, TronWeb>()

/**
 * TronWeb `fullHost` for codec-only usage, from `RPC_URL_<NETWORK>` env var
 * (with fallback to TronGrid defaults), with `/jsonrpc` stripped.
 *
 * @param networkName `tron` or `tronshasta` (case-insensitive)
 */
export function getTronWebCodecFullHostForNetwork(networkName: string): string {
  const key = networkName.toLowerCase()
  if (!isTronNetworkKey(key)) {
    throw new Error(
      `getTronWebCodecFullHostForNetwork: expected a Tron network key, got ${networkName}`
    )
  }

  const rpcUrlRaw = getTronRpcUrl(key)
  return tronWebFullHostFromRpcUrl(key, rpcUrlRaw)
}

/**
 * Shared TronWeb for address / ABI codec helpers only (no private key), keyed by network.
 */
export function getTronWebCodecOnlyForNetwork(networkName: string): TronWeb {
  const key = networkName.toLowerCase()
  if (!isTronNetworkKey(key)) {
    throw new Error(
      `getTronWebCodecOnlyForNetwork: expected a Tron network key, got ${networkName}`
    )
  }

  let inst = tronWebCodecByNetwork.get(key)
  if (!inst) {
    inst = new TronWeb({ fullHost: getTronWebCodecFullHostForNetwork(key) })
    tronWebCodecByNetwork.set(key, inst)
  }

  return inst
}
