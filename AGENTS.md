# tron-devkit

Bun workspace for `@lifi/tron-devkit`, the public npm library that LI.FI contract repos (`contracts`,
`contracts-tron`) use to deploy and operate contracts on Tron: Forge artifact loading, deployment with
energy and bandwidth estimation, Tron base58 and EVM hex address helpers, TronWeb and viem clients, and Safe
`execTransaction` broadcasting. The package's user-facing docs are in `packages/tron-lib/README.md`.

## Layout

- `packages/tron-lib/`: the only workspace package, `@lifi/tron-devkit`.
  - `src/index.ts`: public API (main entry); `src/safe/index.ts`: the `./safe` subpath export.
  - `src/TronContractDeployer.ts`: deployment lifecycle (estimate, balance check, broadcast, confirm).
  - `src/helpers/`: TronWeb and viem factories, RPC and TronGrid config, energy and price estimation,
    Forge artifact loading, explorer URLs.
  - `src/utils/`: env helpers, network keys, rate-limit retry, fetch with timeout.
  - `src/tronAddressHelpers.ts`, `src/constants.ts`, `src/types.ts`.
  - `postinstall-tronweb-fix.mjs`: patches TronWeb's bundled `proto` variable after install; it also ships
    in the package and runs in consumers.
- `.github/workflows/`: `ci.yml` (lint, format check, build on PRs), `publish.yml` (release and npm
  publish on version tags), `semantic-pr.yml` (PR title).

## Commands

Run from the repo root with Bun.

```bash
bun install          # also runs the TronWeb postinstall patch
bun run build        # tsc for @lifi/tron-devkit into packages/tron-lib/dist
bun run lint         # oxlint; bun run lint:fix to fix
bun run format:check # oxfmt; bun run format to write
```

There is no test suite: CI runs `lint`, `format:check` and `build`.

## Env

The library reads its env from the process of the script that imports it; nothing in this repo loads a
`.env`. `.env.example` lists every variable with what it does. In `packages/tron-lib/`,
`src/utils/envHelpers.ts` and `src/helpers/tronRpcConfig.ts` hold the lookups: an explicit argument (CLI flag) wins over the env var,
which wins over the TronGrid default URL. Only `tron` and `tronshasta` are known networks.

## Conventions

- Formatting is oxfmt (`.oxfmtrc.json`: no semicolons, single quotes, ES5 trailing commas, 80 columns).
  `.git-blame-ignore-revs` lists bulk-format commits; add new ones there.
- Conventional commits and PR titles (`semantic-pr.yml`).
- Release: `bun run release` (or `release:beta`, `release:alpha`) bumps `packages/tron-lib/package.json`,
  commits `chore: release vX.Y.Z` and tags `vX.Y.Z` without pushing. Pushing the tag runs `publish.yml`,
  which creates the GitHub release and publishes to npm with provenance (`alpha` and `beta` dist-tags for
  prereleases).
- New public functions are exported from `packages/tron-lib/src/index.ts` (or `src/safe/index.ts`) and documented in
  `packages/tron-lib/README.md`.

## Ownership

API Expansion squad, reviewer Daniela (`@melianessa`).
Review requests: request the reviewer above on the PR.
