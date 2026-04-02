/**
 * Generic Tron deployment constants.
 * No repo-specific constants (Diamond, Safe ABIs, etc.) — those stay in each consumer repo.
 */

/** HTTP header name for TronGrid authenticated requests. */
export const TRON_PRO_API_KEY_HEADER = 'TRON-PRO-API-KEY' as const

/** TTL for caching energy and bandwidth prices from the Tron API (ms). */
export const PRICE_CACHE_TTL_MS = 60 * 60 * 1000

/** Fallback energy price in TRX per energy unit if `getEnergyPrices` fails. */
export const FALLBACK_ENERGY_PRICE_TRX = 0.00021

/** Fallback bandwidth price in TRX per bandwidth point if `getBandwidthPrices` fails. */
export const FALLBACK_BANDWIDTH_PRICE_TRX = 0.001

// Safety margin for energy estimation to prevent transaction failures
export const DEFAULT_SAFETY_MARGIN = 1.2 // 20% buffer for standard operations

// Maximum TRX amount willing to spend on transaction fees
export const DEFAULT_FEE_LIMIT_TRX = 5000

// Triggers console warning when deployer balance falls below this threshold
export const MIN_BALANCE_WARNING = 100

// Minimum balance required for contract resource registration on Tron
export const MIN_BALANCE_REGISTRATION = 5

// Bandwidth calculation constants
// Formula: rawDataLength + DATA_HEX_PROTOBUF_EXTRA + MAX_RESULT_SIZE_IN_TX + (signatures * A_SIGNATURE)
export const DATA_HEX_PROTOBUF_EXTRA = 3
export const MAX_RESULT_SIZE_IN_TX = 64
export const A_SIGNATURE = 67

// Tron-specific zero address (41 prefix instead of 0x)
export const TRON_ZERO_ADDRESS = '410000000000000000000000000000000000000000'

/** Canonical EVM zero address. */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// Delay (ms) before each RPC call during registration/verification to avoid 429 rate limits
export const REGISTRATION_RPC_DELAY_MS = 8000

// Delay (ms) between retries when RPC returns 429
export const REGISTRATION_RETRY_DELAY_MS = 10000

/** Default number of retry attempts for recoverable RPC/network errors. */
export const MAX_RETRIES = 3

/** Delay between retry attempts when rate limits are hit (ms). */
export const RETRY_DELAY = 2000

/** 50 TRX in SUN — shared fee limit bound. */
export const TRON_SCRIPT_FEE_LIMIT_50_TRX_SUN = 50_000_000

/** Default `fee_limit` (SUN) for Safe `execTransaction`. */
export const TRON_SAFE_EXEC_DEFAULT_FEE_LIMIT_SUN =
  TRON_SCRIPT_FEE_LIMIT_50_TRX_SUN

/** Env var overriding Safe exec fee limit. */
export const TRON_SAFE_EXEC_FEE_LIMIT_SUN_ENV =
  'TRON_SAFE_EXEC_FEE_LIMIT_SUN' as const

/** Poll interval (ms) after broadcasting Safe exec while waiting for confirmation. */
export const TRON_SAFE_EXEC_CONFIRM_POLL_MS = 2_000

/** Default max wait (ms) for Tron Safe exec confirmation polling. */
export const TRON_SAFE_EXEC_CONFIRM_TIMEOUT_MS_DEFAULT = 100_000

/** High `fee_limit` (SUN) for `triggerconstantcontract` estimation only. */
export const TRON_TRIGGER_ESTIMATE_FEE_LIMIT_SUN = 1_000_000_000

/** Timeout (ms) for direct Tron full-node `wallet/*` HTTP calls. */
export const TRON_WALLET_API_FETCH_TIMEOUT_MS = 30_000
