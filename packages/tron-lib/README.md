# @lifinance/tron-lib

Shared Tron library for deploying and interacting with smart contracts on the Tron blockchain. Provides deployment tooling, address helpers, energy estimation, and a `troncast` CLI (Cast-like tool for Tron).

## Installation

```bash
bun add @lifinance/tron-lib
```

## Quick Start

```typescript
import {
  TronContractDeployer,
  loadForgeArtifact,
  getPrivateKey,
  getTronRpcUrl,
} from '@lifinance/tron-lib'

// 1. Compile your contracts with Forge
// cd your-repo && forge build

// 2. Load artifact and deploy
const deployer = new TronContractDeployer({
  fullHost: getTronRpcUrl('tron'),       // RPC_URL_TRON or TronGrid fallback
  tvmNetworkKey: 'tron',
  privateKey: getPrivateKey(),            // from PRIVATE_KEY env var
})

const artifact = await loadForgeArtifact('MyContract', './out')
const result = await deployer.deployContract(artifact, [/* constructor args */])

console.log(`Deployed to: ${result.contractAddress}`)
console.log(`Cost: ${result.actualCost.trxCost} TRX`)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Deployer private key (hex, with or without `0x`) |
| `RPC_URL_TRON` | No | Tron mainnet RPC URL (default: `https://api.trongrid.io`) |
| `RPC_URL_TRONSHASTA` | No | Tron Shasta testnet RPC URL (default: `https://api.shasta.trongrid.io`) |
| `TRONGRID_API_KEY` | No | TronGrid API key (reduces rate limiting) |

## Core Features

### Contract Deployment (`TronContractDeployer`)

Full deployment lifecycle:
- Energy + bandwidth estimation via `triggerconstantcontract`
- Cost validation against account balance (accounting for delegated resources)
- Rate-limit retry logic (TronGrid 429 backoff)
- Receipt confirmation polling
- Dry-run mode for cost previews

```typescript
const deployer = new TronContractDeployer({
  fullHost: 'https://api.trongrid.io',
  tvmNetworkKey: 'tron',
  privateKey: '0x...',
  dryRun: false,        // set true for cost preview
  verbose: false,       // set true for debug logging
  safetyMargin: 1.2,   // 20% energy buffer (default)
})
```

### Forge Artifact Loading

Load compiled contract artifacts from Forge output:

```typescript
import { loadForgeArtifact } from '@lifinance/tron-lib'

// Default: loads from <cwd>/out/<Name>.sol/<Name>.json
const artifact = await loadForgeArtifact('MyContract')

// Custom artifacts directory
const artifact = await loadForgeArtifact('MyContract', '/path/to/out')
```

### Address Conversion

Bidirectional Tron base58 <-> EVM hex conversion:

```typescript
import {
  tronAddressToHex,
  evmHexToTronBase58,
  tronAddressLikeToBase58,
} from '@lifinance/tron-lib'

// Tron base58 -> EVM hex
const hex = tronAddressToHex(tronWeb, 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW')
// -> '0x...'

// EVM hex -> Tron base58
const base58 = evmHexToTronBase58(tronWeb, '0x...')
// -> 'TJCn...'
```

### Energy & Cost Estimation

```typescript
import {
  estimateContractCallEnergy,
  estimateEnergyAndFeeLimit,
  getCurrentPrices,
} from '@lifinance/tron-lib'

// Get current energy/bandwidth prices
const { energyPrice, bandwidthPrice } = await getCurrentPrices(tronWeb)

// Estimate energy for a contract call
const energy = await estimateContractCallEnergy({
  fullHost: 'https://api.trongrid.io',
  tronWeb,
  contractAddressBase58: 'T...',
  functionSelector: 'transfer(address,uint256)',
  parameterHex: '...',
})
```

### Safe Transaction Broadcasting

For multisig governance workflows:

```typescript
import { broadcastTronContractCall } from '@lifinance/tron-lib/safe'

const result = await broadcastTronContractCall({
  networkKey: 'tron',
  privateKeyHex: '0x...',
  contractAddress: '0x...',
  calldata: '0x...',
})
```

## troncast CLI

Cast-like CLI for Tron blockchain interactions. Available as `troncast` binary or via `bun run`:

```bash
# Read-only contract call
bun troncast call <address> "balanceOf(address) returns (uint256)" <param> --env mainnet

# Send transaction
bun troncast send <address> "transfer(address,uint256)" <to>,<amount> --env mainnet

# Get contract bytecode
bun troncast code <address> --env mainnet

# Address conversion
bun troncast address to-hex <tron-base58-address>
bun troncast address to-base58 <evm-hex-address>
```

### troncast Environment

- `--env mainnet` uses `RPC_URL_TRON` (fallback: `https://api.trongrid.io`)
- `--env testnet` uses `RPC_URL_TRONSHASTA` (fallback: `https://api.shasta.trongrid.io`)
- `--rpcUrl <url>` overrides the environment variable
- `send` command uses `PRIVATE_KEY` env var (or `--privateKey` flag)

## Integrating a New Repo

1. **Install the library:**
   ```bash
   bun add @lifinance/tron-lib
   ```

2. **Compile contracts:**
   ```bash
   forge build
   ```

3. **Set environment variables:**
   ```bash
   export PRIVATE_KEY=0x...
   export RPC_URL_TRON=https://api.trongrid.io  # optional
   export TRONGRID_API_KEY=...                    # optional
   ```

4. **Write a deployment script:**
   ```typescript
   import {
     TronContractDeployer,
     loadForgeArtifact,
     getPrivateKey,
     getTronRpcUrl,
   } from '@lifinance/tron-lib'

   const deployer = new TronContractDeployer({
     fullHost: getTronRpcUrl('tron'),
     tvmNetworkKey: 'tron',
     privateKey: getPrivateKey(),
   })

   for (const name of ['ContractA', 'ContractB']) {
     const artifact = await loadForgeArtifact(name, './out')
     const result = await deployer.deployContract(artifact)
     console.log(`${name}: ${result.contractAddress}`)
   }
   ```

5. **Run it:**
   ```bash
   bun run script/tron/deploy.ts
   ```

## API Reference

### Exports from `@lifinance/tron-lib`

| Export | Description |
|--------|-------------|
| `TronContractDeployer` | Main deployment class |
| `loadForgeArtifact` | Load Forge build artifacts |
| `getPrivateKey` | Read `PRIVATE_KEY` from env |
| `getTronRpcUrl` | Read RPC URL with TronGrid fallback |
| `tronAddressToHex` | Tron base58 -> EVM hex |
| `evmHexToTronBase58` | EVM hex -> Tron base58 |
| `createTronWeb` | Create TronWeb instance |
| `createTronWebForTvmNetworkKey` | Create TronWeb from network key |
| `createTronWebReadOnly` | Read-only TronWeb (no signing) |
| `estimateContractCallEnergy` | Estimate energy for contract call |
| `getCurrentPrices` | Get energy/bandwidth prices |
| `tronScanTransactionUrl` | Build TronScan TX URL |
| `formatAddressForNetworkCliDisplay` | Format address for CLI output |
| `isTronNetworkKey` | Check if network key is Tron |
| `TronWalletClient` | Wallet wrapper for Safe operations |

### Exports from `@lifinance/tron-lib/safe`

| Export | Description |
|--------|-------------|
| `broadcastTronContractCall` | Broadcast arbitrary contract call |
| `broadcastTronSafeExecTransaction` | Broadcast Safe execTransaction |

## Tron vs EVM — Key Differences

| Aspect | EVM | Tron |
|--------|-----|------|
| Address format | `0x` + 40 hex | Base58 (T prefix, 34 chars) |
| Gas model | Gas per opcode | Energy + Bandwidth |
| RPC | Standard JSON-RPC | TronWeb HTTP API |
| Fee unit | Wei (ETH) | SUN (1 TRX = 1,000,000 SUN) |
| CREATE2 | Deterministic | Different addresses than EVM |
| Rate limits | Varies | TronGrid has aggressive 429s |
