import type { TronWeb } from 'tronweb'
import type { Address, Hex } from 'viem'

/** Tron TVM network keys (mainnet / Shasta). */
export type TronTvmNetworkName = 'tron' | 'tronshasta'

/** Result of broadcasting Safe `execTransaction` on Tron via TronWeb. */
export interface IExecuteSafeExecTronWebResult {
  txId: string
  hash: Hex
}

/** Params for Tron Safe `execTransaction` broadcast (signing key supplied separately). */
export interface ITronSafeExecParams {
  networkName: TronTvmNetworkName
  safeAddressEvm: Address
  to: Address
  value: bigint
  data: Hex
  operation: number
  signatures: Hex
  confirmTimeoutMs?: number
}

export type IBroadcastTronSafeExecParams = ITronSafeExecParams & {
  privateKeyHex: string
}

export interface ICreateTronWebOptions {
  /**
   * RPC URL as in env (may end with `/jsonrpc` or trailing slashes).
   * When `networkKey` is `tron` or `tronshasta`, normalized to TronWeb's native HTTP root.
   */
  rpcUrl: string
  networkKey?: TronTvmNetworkName
  privateKey?: string
  headers?: Record<string, string>
  tronProApiKey?: string
  verbose?: boolean
}

/** Generic contract-call broadcast (any contract, any calldata) via TronWeb. */
export interface IBroadcastTronContractCallParams {
  networkKey: TronTvmNetworkName
  privateKeyHex: string
  contractAddress: Address
  calldata: Hex
  callValue?: bigint
  confirmTimeoutMs?: number
}

export interface IBroadcastTronContractCallResult {
  txId: string
  hash: Hex
}

/** Parameters for estimating contract call energy via TRON triggerconstantcontract API */
export interface IEstimateContractCallEnergyParams {
  fullHost: string
  tronWeb: TronWeb
  contractAddressBase58: string
  functionSelector: string
  parameterHex: string
  safetyMargin?: number
  feeLimitForEstimation?: number
}

/** Cache entry for TRON energy/bandwidth prices with TTL */
export interface IPriceCache {
  energyPrice: number
  bandwidthPrice: number
  timestamp: number
}

/** Base shape for viem HTTP RPC transport (URL + optional fetch headers) */
export interface IViemRpcTransportConfigBase {
  url: string
  fetchOptions?: { headers: Record<string, string> }
}

/** Viem HTTP transport with optional retry tuning (e.g. TronGrid 429 backoff) */
export interface IViemRpcTransportConfig extends IViemRpcTransportConfigBase {
  retryCount?: number
  retryDelay?: number
}

/** Response from Tron getaccountresource (snake_case or camelCase from different clients) */
export interface IAccountResourceResponse {
  EnergyLimit?: number
  EnergyUsed?: number
  NetLimit?: number
  NetUsed?: number
  freeNetLimit?: number
  freeNetUsed?: number
  energy_limit?: number
  energy_used?: number
  net_limit?: number
  net_used?: number
  free_net_limit?: number
  free_net_used?: number
}

export interface ITronDeploymentConfig {
  /** Tron RPC URL. May include `/jsonrpc`; when `tvmNetworkKey` is set, it is normalized for TronWeb. */
  fullHost: string
  /** When set, {@link fullHost} is normalized (e.g. strip `/jsonrpc`). */
  tvmNetworkKey?: TronTvmNetworkName
  privateKey: string
  feeLimit?: number
  userFeePercentage?: number
  originEnergyLimit?: number
  safetyMargin?: number
  maxRetries?: number
  confirmationTimeout?: number
  verbose?: boolean
  dryRun?: boolean
  headers?: Record<string, string>
}

export interface ITronCostEstimate {
  energy: number
  bandwidth: number
  totalTrx: number
  feeLimit: number
  breakdown: {
    energyCost: number
    bandwidthCost: number
    energyFactor: number
    safetyMargin: number
  }
}

export interface ITronDeploymentResult {
  contractAddress: string
  transactionId: string
  deploymentTransaction: any
  receipt: any
  costEstimate: ITronCostEstimate
  actualCost: {
    energyUsed: number
    bandwidthUsed: number
    trxCost: number
  }
}

export interface IForgeArtifact {
  abi: any[]
  bytecode: {
    object: string
    sourceMap: string
    linkReferences: Record<string, any>
  }
  deployedBytecode: {
    object: string
    sourceMap: string
    linkReferences: Record<string, any>
  }
  methodIdentifiers: Record<string, string>
  rawMetadata: string
  metadata: {
    compiler: {
      version: string
    }
    language: string
    output: any
    settings: any
    sources: Record<string, any>
    version: number
  }
}
