# Live execution checklist

The rehearsal is runnable today. Do not switch to `MODE=live` until the following actions are completed and actual evidence has been recorded.

## Account and funding prerequisites

1. **NOWNodes:** €15 voucher credit is already redeemed. The free Start activation screen offers one month and displays a subsequent €20/month Pro switch. That unrequested renewal has not been accepted. Activate an acceptable plan, enable Solana and Cardano, then store its API key only in `.env` as `NOWNODES_API_KEY`. A balance alone does not provide an enabled API key.
2. **CRE:** the official CLI is installed under `.local/bin/cre`. Complete `cre login` with the project's account, or provide the officially supported `CRE_API_KEY` secret. CLI simulation currently reports authentication required. Set `CRE_AUTHENTICATED=true` only after a verified login. Compile success is not simulation success.
3. **Cardano:** obtain a Blockfrost **preprod** project key as `BLOCKFROST_PREPROD_KEY`. Fund the generated operator agent address from the official preprod faucet with test ADA. Set the generated seller address as `CARDANO_SELLER_ADDRESS`; it receives 2 tADA per task. Keys and mnemonic JSON remain under `.local/` with mode 0600.
4. **Solana:** fund the generated authority on Devnet for program deployment and fees, the worker for reservation fees, and a buyer-controlled Devnet wallet for the reward and rent. The public airdrop attempt failed; no wallets are presently claimed funded. Do not use personal mainnet assets.

`pnpm wallets` creates missing test wallets without replacing existing ones. `pnpm doctor` reports configuration and probes Devnet availability; configured indicators do not prove sponsor execution.

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
