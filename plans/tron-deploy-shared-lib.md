# Shared Tron Deployment Library — Merged Plan

## Context

`contracts/` already implements the correct Tron deployment path: Bun + `TronContractDeployer` + compiled Forge artifacts via TronWeb. The EVM repos (`catapultar/`, `catalyst-intent/`) use `vm.createSelectFork` + `broadcast` in Forge scripts — this does not work for Tron. We replicate the deployment staging in TypeScript, not by running Solidity scripts against Tron.

```
EVM repos:  forge script deploy.s.sol → EVM RPC
Tron path:  forge build → artifacts → @lifinance/tron-deploy → TronWeb → Tron RPC
```

## Architecture: `@lifinance/tron-deploy` package + per-repo recipes

### Development approach
- Develop as a **Bun workspace package** at `packages/tron-deploy-lib/` (immediate, zero-publish workflow)
- All 3 repos resolve it via `workspace:*` within `tron-deployment/`
- **Publish to npm** as `@lifinance/tron-deploy` once API is validated against `contracts/`

### Dependency direction: ONE-WAY (repos depend on package, never the reverse)
```
@lifinance/tron-deploy  ← ZERO imports from any repo. Only deps: tronweb, viem, consola.
         ↑
    ┌────┼────────────────┐
    │    │                 │
contracts/  catapultar/  catalyst-intent/  (any future repo)
```
Any repo can `bun add @lifinance/tron-deploy` and deploy to Tron. The package knows nothing about any specific contracts.

### Explicit non-goals for the package
- No `config/networks.json`, no diamond/periphery registration
- No LiFi-specific Safe deploy/propose workflows
- No hardcoded contract addresses or deployment configs
- No imports from any consumer repo — package is fully standalone
- These stay in each repo as thin wrappers that import the package

## What goes where

### In `@lifinance/tron-deploy` package:

| Layer | Include | Source |
|-------|---------|--------|
| Core | `TronContractDeployer`, `types.ts`, `tronAddressHelpers.ts` | `contracts/script/deploy/tron/` |
| RPC/Web3 | `tronWebFactory.ts`, `tronRpcConfig.ts`, `tronWebCodecOnly.ts` | `contracts/.../helpers/` |
| Estimation | `estimateContractEnergy.ts`, `tronPricing.ts` | `contracts/.../helpers/` |
| Artifacts | `loadForgeArtifact.ts` (parameterized `artifactsDir`) | `contracts/.../helpers/` |
| Network | `tronTvmChain.ts`, `isTronGridRpcUrl.ts`, `tronGridTransport.ts`, `tronJsonRpcForViem.ts` | `contracts/.../helpers/` |
| Display | `formatAddressForCliDisplay.ts`, `tronScanUrls.ts` | `contracts/.../helpers/` |
| Safe (generic) | `tronSafeExecBroadcast.ts`, `TronWalletClient.ts` | `contracts/.../helpers/` |
| Utils (inlined) | `sleep`, `fetchWithTimeout`, `retryWithRateLimit`, `envHelpers`, `networkKeys` | Various `contracts/` utils |

### Stays in each repo:
- `contracts/`: Diamond facet deployment/registration, Safe deploy/propose, facet group constants, periphery lists, MongoDB governance
- `catapultar/`: Deployment order, constructor args, address persistence
- `catalyst-intent/`: 2-stage deployment logic, polymer.json updates, Compact skip logic

## Package file structure

```
packages/tron-deploy-lib/
├── package.json                  # @lifinance/tron-deploy, deps: tronweb@^6, viem@^2, consola@^3
├── tsconfig.json
└── src/
    ├── index.ts                  # Barrel export
    ├── TronContractDeployer.ts   # Core deployer
    ├── tronAddressHelpers.ts     # Tron↔EVM address conversion
    ├── types.ts                  # Generic types only (no Diamond/Safe-specific)
    ├── constants.ts              # Generic constants only (pricing, bandwidth, timing)
    ├── utils/
    │   ├── sleep.ts              # Inlined (~3 lines)
    │   ├── fetchWithTimeout.ts   # Inlined (~15 lines)
    │   ├── retryWithRateLimit.ts # Inlined (~50 lines)
    │   ├── envHelpers.ts         # getEnvVar(), getRPCEnvVarName()
    │   └── networkKeys.ts        # isTronNetworkKey()
    ├── helpers/
    │   ├── tronWebFactory.ts
    │   ├── tronPricing.ts
    │   ├── estimateContractEnergy.ts
    │   ├── tronRpcConfig.ts
    │   ├── loadForgeArtifact.ts  # Accept artifactsDir param
    │   ├── tronWebCodecOnly.ts   # Accept network param
    │   ├── tronJsonRpcForViem.ts
    │   ├── isTronGridRpcUrl.ts
    │   ├── tronScanUrls.ts
    │   ├── tronGridTransport.ts
    │   ├── tronTvmChain.ts       # Hardcode chain IDs, drop networks.json
    │   ├── formatAddressForCliDisplay.ts
    │   └── TronWalletClient.ts
    └── safe/
        └── tronSafeExecBroadcast.ts
```

## Key extraction changes

1. **`loadForgeArtifact`** — add `artifactsDir` param (currently assumes `cwd/out/`)
2. **`tronTvmChain.ts`** — hardcode Tron chain IDs (728126428 / 2494104990), drop `networks.json`
3. **`tronWebCodecOnly.ts`** — take network as parameter, drop `TRON_DEPLOY_NETWORK`
4. **`tronRpcConfig.ts`** — use inlined `getEnvVar`/`getRPCEnvVarName`
5. **`types.ts`** — remove `IDiamondRegistrationResult`, `IProposeToSafeTronOptions`, `ITronSafeTemp`
6. **`constants.ts`** — remove `TRON_DIAMOND_FACET_GROUPS`, Safe ABIs, Safe artifact paths
7. **Inline 6 external deps** (~80 lines total) into `src/utils/`

## Implementation phases (ordered by validation)

### Phase 1: Create the package
1. Create `packages/tron-deploy-lib/` with package.json, tsconfig
2. Copy + clean reusable files from `contracts/script/deploy/tron/`
3. Inline external deps, apply parameterization changes
4. Write barrel export
5. Verify standalone compilation

### Phase 2: Root workspace setup
1. Create root `package.json` with Bun workspaces
2. Root `tsconfig.json` with project references
3. `bun install` to link

### Phase 3: Validate against `contracts/` (important — heaviest consumer)
1. Add `@lifinance/tron-deploy: workspace:*` to contracts
2. Update imports in all Tron scripts
3. Delete extracted files from contracts
4. **Verify existing deployment scripts still work** — this validates the package API

### Phase 4: Catapultar Tron deployment (highest priority per stakeholder)
Create `catapultar/solidity/script/tron/deploy-catapultar.ts`:
- Prerequisite: `forge build` in `catapultar/solidity/`
- Deploy order mirrors `deploy.s.sol`: CatapultarFactory → CATValidator → IntentExecutor
- Constructor args identical to Solidity script
- Use `TronContractDeployer.deployContract` (standard deployment, **not** CREATE2)
- Write addresses to `deployments/tron.json`
- CREATE2 / predictDeploy: **deferred** — deploy opaquely first, revisit deterministic addresses later

### Phase 5: catalyst-intent Tron deployment (two stages)
Create TS entrypoints beside existing Forge scripts:

**Stage 1** — `catalyst-intent/script/tron/deploy-tron.ts`:
- Deploy **reduced** subset: InputSettlerEscrowLIFI + OutputSettlerSimple
- Skip Compact + InputSettlerCompactLIFI (per requirements)
- TheCompact/KeylessCreate2Factory may not exist on Tron — skip or substitute verified addresses
- Constructor args: pass `initialOwner` address

**Stage 2** — `catalyst-intent/script/tron/deploy-oracle-tron.ts`:
- Read Polymer implementation from `script/polymer.json`
- Add Tron entry: `TNKCTuonyurjAXBYpZtSZEo7WdFUKW9cbN` as "polymer" key
- Deploy PolymerOracleMapped with chain mapping
- Write back oracle address to `polymer.json`

### Phase 6 (future): Publish to npm
Once validated: add build step, configure exports, publish as `@lifinance/tron-deploy`.

## Next repo integration checklist
1. `bun add @lifinance/tron-deploy` (or `workspace:*`)
2. `forge build` (compile contracts)
3. Add `.env` with `ETH_NODE_URI_TRON` + `TRON_PRIVATE_KEY`
4. Write one entry script: load artifacts → deploy in order → update `deployments/tron.json`
5. CI: `forge build && bun run script/tron/deploy.ts` (dry-run optional)

## Risk register

| Risk | Mitigation |
|------|-----------|
| CREATE2 / deterministic addresses differ on Tron | Deploy opaquely first; revisit `predictDeploy` with Tron-accurate math later |
| catalyst-intent Compact/OIF deps may not exist on Tron | Stage 1 must be explicit reduced recipe, not blind port of deploy.s.sol |
| PUSH0 opcode may not be available on Tron | Compile with `evm_version = "paris"` in foundry.toml |
| Polymer/Wormhole may not support Tron natively | Verify oracle support before Stage 2; may need alternative oracle |
| TheCompact + KeylessCreate2Factory not on Tron | Skip or deploy separately with Tron-specific factory |

## Critical files to modify
- `contracts/script/deploy/tron/TronContractDeployer.ts` → extract to package
- `contracts/script/deploy/tron/types.ts` → split generic vs LiFi-specific
- `contracts/script/deploy/tron/constants.ts` → split generic vs LiFi-specific
- `contracts/script/deploy/tron/helpers/*` → extract all to package
- `contracts/script/deploy/tron/tronAddressHelpers.ts` → extract to package
- `catapultar/solidity/script/tron/` → create new
- `catalyst-intent/script/tron/` → create new
