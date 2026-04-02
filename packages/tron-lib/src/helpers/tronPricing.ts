import { consola } from 'consola'
import type { TronWeb } from 'tronweb'

import {
  A_SIGNATURE,
  DATA_HEX_PROTOBUF_EXTRA,
  FALLBACK_BANDWIDTH_PRICE_TRX,
  FALLBACK_ENERGY_PRICE_TRX,
  MAX_RESULT_SIZE_IN_TX,
  PRICE_CACHE_TTL_MS,
  TRON_WALLET_API_FETCH_TIMEOUT_MS,
} from '../constants'
import type { IAccountResourceResponse, IPriceCache } from '../types'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'

import { buildTronWalletJsonPostHeaders } from './tronRpcConfig'

let priceCache: IPriceCache | null = null

function parseLatestPrice(priceString: string): number {
  const now = Date.now()
  const prices = priceString.split(',').map((entry) => {
    const parts = entry.split(':')
    const timestamp = Number(parts[0] || 0)
    const price = Number(parts[1] || 0)
    return { timestamp, price }
  })

  prices.sort((a, b) => b.timestamp - a.timestamp)

  for (const { timestamp, price } of prices) if (timestamp <= now) return price

  const lastPrice = prices[prices.length - 1]
  return lastPrice ? lastPrice.price : 0
}

/**
 * Calculate transaction bandwidth.
 */
export function calculateTransactionBandwidth(transaction: any): number {
  const rawDataLength = transaction.raw_data_hex
    ? transaction.raw_data_hex.length / 2
    : JSON.stringify(transaction.raw_data).length

  const signatureCount = transaction.signature?.length || 1

  return (
    rawDataLength +
    DATA_HEX_PROTOBUF_EXTRA +
    MAX_RESULT_SIZE_IN_TX +
    signatureCount * A_SIGNATURE
  )
}

/**
 * Get current energy and bandwidth prices from the Tron network.
 * Prices are returned in TRX (not SUN). Results are cached for 1 hour.
 */
export async function getCurrentPrices(
  tronWeb: TronWeb
): Promise<{ energyPrice: number; bandwidthPrice: number }> {
  if (priceCache && Date.now() - priceCache.timestamp < PRICE_CACHE_TTL_MS) {
    consola.debug('Using cached prices')
    return {
      energyPrice: priceCache.energyPrice,
      bandwidthPrice: priceCache.bandwidthPrice,
    }
  }

  try {
    consola.debug('Fetching current prices from Tron network...')

    const [energyPricesStr, bandwidthPricesStr] = await Promise.all([
      tronWeb.trx.getEnergyPrices(),
      tronWeb.trx.getBandwidthPrices(),
    ])

    const energyPriceSun = parseLatestPrice(energyPricesStr)
    const bandwidthPriceSun = parseLatestPrice(bandwidthPricesStr)

    const energyPrice = energyPriceSun / 1_000_000
    const bandwidthPrice = bandwidthPriceSun / 1_000_000

    priceCache = {
      energyPrice,
      bandwidthPrice,
      timestamp: Date.now(),
    }

    consola.debug(
      `Current prices - Energy: ${energyPrice} TRX, Bandwidth: ${bandwidthPrice} TRX`
    )

    return { energyPrice, bandwidthPrice }
  } catch (error) {
    consola.warn(
      'Failed to fetch current prices from network, using fallback values:',
      error
    )

    return {
      energyPrice: FALLBACK_ENERGY_PRICE_TRX,
      bandwidthPrice: FALLBACK_BANDWIDTH_PRICE_TRX,
    }
  }
}

/**
 * Get account's available delegated (or owned) energy and bandwidth.
 */
export async function getAccountAvailableResources(
  fullHost: string,
  addressBase58: string
): Promise<{ availableEnergy: number; availableBandwidth: number }> {
  const url = fullHost.replace(/\/$/, '') + '/wallet/getaccountresource'
  let res: Response
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: buildTronWalletJsonPostHeaders(fullHost),
        body: JSON.stringify({ address: addressBase58, visible: true }),
      },
      TRON_WALLET_API_FETCH_TIMEOUT_MS
    )
  } catch {
    return { availableEnergy: 0, availableBandwidth: 0 }
  }
  if (!res.ok) {
    return { availableEnergy: 0, availableBandwidth: 0 }
  }
  const data = (await res.json()) as IAccountResourceResponse
  const energyLimit = data.EnergyLimit ?? data.energy_limit ?? 0
  const energyUsed = data.EnergyUsed ?? data.energy_used ?? 0
  const netLimit = data.NetLimit ?? data.net_limit ?? 0
  const netUsed = data.NetUsed ?? data.net_used ?? 0
  const freeNetLimit = data.freeNetLimit ?? data.free_net_limit ?? 0
  const freeNetUsed = data.freeNetUsed ?? data.free_net_used ?? 0
  const availableEnergy = Math.max(0, energyLimit - energyUsed)
  const availableBandwidth =
    Math.max(0, netLimit - netUsed) + Math.max(0, freeNetLimit - freeNetUsed)
  return { availableEnergy, availableBandwidth }
}

/**
 * Calculate the estimated cost in TRX based on energy and bandwidth usage.
 */
export async function calculateEstimatedCost(
  tronWeb: TronWeb,
  estimatedEnergy: number,
  estimatedBandwidth = 0
): Promise<{ energyCost: number; bandwidthCost: number; totalCost: number }> {
  const { energyPrice, bandwidthPrice } = await getCurrentPrices(tronWeb)

  const energyCost = estimatedEnergy * energyPrice
  const bandwidthCost = estimatedBandwidth * bandwidthPrice
  const totalCost = energyCost + bandwidthCost

  return {
    energyCost,
    bandwidthCost,
    totalCost,
  }
}
