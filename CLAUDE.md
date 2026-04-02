# CLAUDE.md — Tron Deployment Workspace

## Project Overview

This workspace (`tron-deployment/`) contains 3 repos + a shared package for deploying and interacting with smart contracts on the **Tron blockchain**. Tron is EVM-compatible but requires a different path: TypeScript + TronWeb (not `forge script --broadcast`).

```
EVM chains:  forge script deploy.s.sol → EVM JSON-RPC
Tron chain:  forge build → artifacts (out/) → @lifinance/tron-lib (TS) → TronWeb → Tron RPC
```

## Directory Structure

```
tron-deployment/
├── CLAUDE.md                     # This file
├── package.json                  # Bun workspace root
├── plans/                        # Architecture plans
│
├── packages/
│   └── tron-lib/                 # Shared Tron library (@lifinance/tron-lib)
│       ├── src/                  # Deployment, address helpers, estimation
│       │   └── troncast/         # Cast-like CLI for Tron
│       └── README.md             # Full documentation
│
├── contracts/                    # LI.FI Diamond proxy contracts (has existing Tron scripts)
│   ├── src/                      # Solidity contracts
│   ├── script/deploy/tron/       # Tron deployment scripts (consumer of shared lib)
│   └── config/                   # networks.json, global.json
│
├── catapultar/                   # Smart account (wallet + intent factory)
│   ├── solidity/                 # Foundry project (src/, script/, test/)
│   │   └── script/tron/          # Tron deployment scripts (consumer of shared lib)
│   └── typescript/               # Client library (viem-based)
│
└── catalyst-intent/              # Intent-based cross-chain swap protocol
    ├── src/                      # Solidity contracts (extends OIF from lib/)
    ├── lib/OIF/                  # Open Intents Framework (core contracts)
    ├── script/
    │   ├── deploy.s.sol          # EVM deployment (Forge)
    │   ├── polymer.s.sol         # EVM Polymer oracle deployment
    │   ├── polymer.json          # Oracle config (implementation addresses per chain)
    │   └── tron/                 # Tron deployment scripts (consumer of shared lib)
    └── test/
```

## The Shared Library: `@lifinance/tron-lib`

Lives at `packages/tron-lib/`. Extracted from `contracts/script/deploy/tron/` + `contracts/script/troncast/`.

### CRITICAL: Dependency direction is ONE-WAY
```
@lifinance/tron-lib  ← has ZERO imports from any repo
         ↑
    ┌────┼────────────────┐
    │    │                 │
contracts/  catapultar/  catalyst-intent/  (any future repo)
```
- The package is **fully standalone**. Dependencies: `tronweb`, `viem`, `consola`, `citty`.
- Every contract repo **depends on** the package, never the reverse.
- The package knows nothing about Diamond proxies, Catapultar, intents, or any specific contracts.
- Any new repo can `bun add @lifinance/tron-lib` and deploy to Tron immediately.

### What it provides:
- **`TronContractDeployer`** — Contract deployment with energy estimation, cost validation, receipt polling, dry-run
- **`troncast`** — Cast-like CLI for Tron (call, send, code, address conversion)
- **`tronAddressHelpers`** — Bidirectional Tron base58 <-> EVM hex address conversion
- **`tronWebFactory`** — TronWeb instance creation with API key headers
- **`tronPricing`** — Energy/bandwidth cost estimation with price caching
- **`estimateContractEnergy`** — Energy estimation via `triggerconstantcontract` API
- **`loadForgeArtifact`** — Load compiled Forge JSON artifacts (parameterized `artifactsDir`)
- **`tronRpcConfig`** — RPC URL from env with TronGrid fallback
- **`tronSafeExecBroadcast`** — Generic Safe multisig transaction execution on Tron

### What it does NOT include (stays in each repo):
- Diamond facet registration (contracts/ specific)
- Safe deploy/propose workflows (contracts/ specific, uses MongoDB)
- Contract addresses, deployment configs
- `config/networks.json` or `config/global.json`

### Dependencies:
- `tronweb@^6` — Tron blockchain interaction
- `viem@^2` — ABI encoding/decoding
- `consola@^3` — Logging/CLI prompts
- `citty@^0.1` — CLI framework (for troncast)

## Environment Variables

```
PRIVATE_KEY=<hex>                                  # Deployer private key
RPC_URL_TRON=https://api.trongrid.io               # Optional (this is the default)
RPC_URL_TRONSHASTA=https://api.shasta.trongrid.io  # Optional (this is the default)
TRONGRID_API_KEY=<key>                             # Optional (reduces rate limiting)
```

**RPC fallback**: If `RPC_URL_TRON` / `RPC_URL_TRONSHASTA` are not set, the library falls back to the public TronGrid endpoints.

## Repo Details

### contracts/ (LI.FI Diamond)
- **Tron status**: COMPLETE — has full deployment scripts
- **Key Tron scripts**: `deploy-core-facets.ts`, `register-facets-to-diamond.ts`, `deploy-and-register-*.ts`, `deploy-safe-tron.ts`, `propose-to-safe-tron.ts`
- **Build**: `forge build` (Solidity 0.8.26+)

### catapultar/ (Smart Account)
- **Branch**: `ts-library` (important — not main)
- **Tron deployment**: `catapultar/solidity/script/tron/deploy-catapultar.ts`
- **Contracts**: CatapultarFactory, CATValidator, IntentExecutor (no constructor args)
- **Build**: `cd catapultar/solidity && forge build` (Solidity 0.8.30, via_ir)
- **CREATE2 caveat**: Produces different addresses on Tron — uses regular CREATE

### catalyst-intent/ (Intent Protocol)
- **Tron deployment**:
  - `catalyst-intent/script/tron/deploy-tron.ts` — Core contracts (InputSettlerEscrowLIFI + OutputSettlerSimple)
  - `catalyst-intent/script/tron/deploy-polymer-oracle-tron.ts` — Polymer oracle (accepts chains array like forge script)
- **Skips**: TheCompact, InputSettlerCompactLIFI (not available on Tron)
- **Build**: `forge build` (Solidity 0.8.30, via_ir, evm_version=cancun)
- **Polymer config**: Tron entry in polymer.json with `TNKCTuonyurjAXBYpZtSZEo7WdFUKW9cbN` as polymer implementation
- **Owner**: Derived from `PRIVATE_KEY` (same as `getSender()` in deploy.s.sol)

## Consumer Script Pattern

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

const artifact = await loadForgeArtifact('MyContract', './out')
const result = await deployer.deployContract(artifact, [/* constructor args */])
```

## Tron vs EVM — Key Differences

- **Addresses**: Same 20 bytes, but Tron uses base58 (T prefix) vs hex (0x prefix)
- **Gas model**: Energy + Bandwidth (not gas). Energy can be delegated/rented
- **RPC**: TronWeb HTTP API, not standard JSON-RPC
- **CREATE2**: Produces different addresses on Tron due to `41` address prefix
- **PUSH0**: May not be supported — compile with `evm_version = "paris"` if needed
- **Rate limits**: TronGrid has aggressive 429s. All scripts include retry/backoff
- **Fee units**: SUN (1 TRX = 1,000,000 SUN)

## Commands Reference

```bash
# Root workspace
bun install                                    # Link all workspaces

# Shared library
cd packages/tron-lib && bunx tsc --noEmit      # Type-check library

# troncast CLI
bun packages/tron-lib/src/troncast/index.ts call <addr> "balanceOf(address)" <param>

# catapultar/
cd catapultar/solidity && forge build
bun run catapultar/solidity/script/tron/deploy-catapultar.ts

# catalyst-intent/
cd catalyst-intent && forge build
bun run catalyst-intent/script/tron/deploy-tron.ts
bun run catalyst-intent/script/tron/deploy-polymer-oracle-tron.ts "[tron]"
```

## Risk Register

| Risk | Status | Mitigation |
|------|--------|-----------|
| CREATE2 addresses differ on Tron | Known | Deploy with regular CREATE; revisit deterministic later |
| Compact/OIF deps may not exist on Tron | Known | Skip Compact, deploy escrow + output only |
| PUSH0 opcode availability | Unknown | Compile with `evm_version = "paris"` if needed |
| Polymer may not support Tron | Unknown | Verify before deploying oracle |
| TheCompact + KeylessCreate2Factory | Unknown | Skip for Tron |
