# Live execution checklist

The current workspace is running in live testnet mode. Three real paid orders and a separate real expiry refund are recorded in [executed evidence](evidence/STATUS.md). The steps below reproduce setup for another operator.

## Account and funding prerequisites

1. **NOWNodes:** €15 redeemed; the user completed free Start activation and enabled Solana/Cardano. The working API key is private in .env. The activation screen advertised a Pro renewal after one month; account billing remains the user's decision.
2. **CRE:** the official CLI is installed under `.local/bin/cre` and login has been verified. `CRE_AUTHENTICATED=true` is configured locally. The actual `workflows/preflight` CLI simulation succeeds against both test networks. This proves connectivity only; the full order verifier has now passed ten checks for the actual paid orders. Production deployment access is not enabled and is not needed for CLI simulation.
3. **Cardano:** the signer and CRE verifier use public **Koios preprod** when `BLOCKFROST_PREPROD_KEY` is empty. A Blockfrost key is optional. The operator agent received **105 preprod tADA** and has about 98.49 remaining after three purchases; see `FUNDING.md`. The generated `CARDANO_SELLER_ADDRESS` is configured locally and receives 2 tADA per task. Keys and mnemonic JSON remain under `.local/` with mode 0600. The hosted facilitator handles submission; the public Koios provider supplies wallet state and historical payment outputs.
4. **Solana:** 2 Devnet SOL arrived at the authority and the generated worker/buyer were funded. Use test assets only. `pnpm run testnet:fund` verifies the Devnet genesis hash and tops up the generated worker to 0.05 SOL and buyer to 0.1 SOL while preserving at least 1 SOL at the authority for deployment. It does not act on other clusters.

`pnpm wallets` creates missing test wallets without replacing existing ones. **Use `pnpm run doctor --json`**: `pnpm doctor` is pnpm's unrelated built-in command. Our doctor probes balances, provider availability and actual CRE login, and saves a public setup audit. Configured indicators do not prove sponsor order execution.

`pnpm run cre:preflight` runs the real HTTP connectivity simulation. It uses stable network genesis identifiers so consensus does not depend on nodes reading the same changing slot. Its transcript is `evidence/cre-preflight.txt`; it makes no payment or settlement.

## Program and workflow

```sh
pnpm program:build
pnpm program:deploy
```

Build uploads the public Rust source to the Solana Playground compiler service. The included ELF is tested in LiteSVM; deployment still needs Devnet SOL. Deployment writes the actual program ID and transaction evidence. Set `SOLANA_PROGRAM_ID` to that deployed ID, never the generated undeployed key.

CRE requires Bun on PATH and the pinned SDK:

```sh
bun node_modules/@chainlink/cre-sdk/bin/cre-compile.ts workflows/verify-order/main.ts .local/orca-verifier.wasm
```

The worker creates a private per-order CRE config and invokes `cre workflow simulate` with the staging target and cron trigger. It accepts only a transcript containing the expected verification result and report hash. Successful live orders export a redacted transcript through their evidence endpoint. There is no workflow deployment or on-chain DON authorization in this version.

## Run live

Set `MODE=live`, the funded keys and all required environment variables from `.env.example`, and a reachable `PUBLIC_API_URL`. The preprod facilitator defaults to Cardano Foundation's hosted endpoint; `FACILITATOR_URL` is configurable. Restart the API and build the frontend with that public API origin. Live mode hides sample scenarios and requires a buyer wallet signature.

Use two valid mainnet public wallet addresses that have recent transactions. Fund the order with Devnet SOL, wait for confirmation, and allow the worker to purchase and verify. Record the true funding, reservation, Cardano payment and settlement hashes; verify them in the correct network explorers. Observe a genuine deadline refund separately. Export evidence with `pnpm evidence` or the interface.

Before recording the sponsor demo, update `docs/evidence/STATUS.md` and submission text with actual results. Do not relabel the rehearsal video as live execution. Do not claim a successful CRE simulation from mocked tests or from compiled WebAssembly alone.

## Durable host

The included, untested Dockerfile targets Node 24 with a persistent `/data` directory. Install the official CRE CLI and Bun separately before using that image in live mode. Keep secrets in the host's secret store, restrict the seller/worker/authority key files, use TLS and exact CORS origins, and keep `/data` on a persistent volume. The current Cloudflare quick tunnel is suitable for rehearsal review only. Maintain a stable API URL through judging and test the frontend from an independent browser before submitting.


## Recorded demo proof

The report challenge locally changes one fee by one smallest unit while preserving the genuine seller signature. It replays the shared verifier at the saved verification time and clearly labels the local copy. It never calls a purchase or settlement endpoint. `pnpm run demo:refund` performs a separate 90-second direct program expiry probe; the UI deadline stays 15 minutes.
