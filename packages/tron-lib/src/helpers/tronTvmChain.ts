/**
 * Tron TVM chain IDs (hardcoded protocol constants, no config dependency).
 */

import type { TronTvmNetworkName } from '../types'

const TRON_CHAIN_IDS: Record<TronTvmNetworkName, number> = {
  tron: 728126428,
  tronshasta: 2494104990,
}

export function getTronNetworkKeyForChainId(
  chainId: number
): TronTvmNetworkName | null {
  for (const [key, id] of Object.entries(TRON_CHAIN_IDS)) {
    if (id === chainId) return key as TronTvmNetworkName
  }
  return null
}

export function isTronTvmChainId(chainId: number): boolean {
  return getTronNetworkKeyForChainId(chainId) !== null
}

export function getTronChainId(networkKey: TronTvmNetworkName): number {
  return TRON_CHAIN_IDS[networkKey]
}
