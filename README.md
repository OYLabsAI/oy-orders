# Orca Orders

Give an agent a job, cap its service spend, and release its task reward only after checking the result.

Built by Orca Labs for TOKEN2049 Origins 2026: Solana task escrow, Cardano x402 commerce, NOWNodes multichain data, and a Chainlink CRE verification workflow.

**Current executable demo is a rehearsal.** It uses sample transactions and simulated payments, with a real local Ed25519 seller signature. It moves no assets and does not execute sponsor infrastructure. The live adapters are implemented but the required accounts, funding, deployment, and successful CRE simulation are still pending. See [executed evidence](docs/evidence/STATUS.md).

## Run in two minutes

Requires Node 24 and pnpm 11.19.0. From this directory:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm build
pnpm start
```

Open `http://localhost:8787`. Choose **Use sample wallets**, then **Run rehearsal**. The other scenarios demonstrate a modified report being rejected and an expired task being refunded. Evidence is inspectable and downloadable in the interface. `pnpm demo` exercises all three cases and exports their JSON under `docs/evidence/`.

```sh
pnpm typecheck
pnpm test
```

29 meaningful tests cover canonical hashing, signatures, receipt/input/payment binding, spending controls, queue recovery, payment reuse, the compiled Solana program in LiteSVM, and independent CRE verifier reads. VM and verifier fixture tests are not public-network executions.

## One task, four necessary integrations

1. The buyer funds **0.01 tSOL** in a Solana Devnet order PDA. Terms bind the buyer, worker, authority, input digest, seller, spending ceiling, and deadline.
2. The agent reserves a **2 tADA** quote and buys a reporting resource through Cardano x402 on preprod. A separate **1 tADA** network-fee ceiling is enforced before broadcast.
3. The report contains up to five recent confirmed transactions for each supplied Solana and Cardano mainnet wallet, read through NOWNodes. No model-generated transaction facts are accepted.
4. A CRE workflow independently reads the escrow, payment, registered seller signature, and multichain facts. A trusted demo relayer releases the Solana reward after a successful real CLI simulation.

These are separate test-asset payments. There is no bridge, exchange-rate conversion, or atomic cross-chain settlement. A rejected report protects the task reward; it does not reverse the Cardano supplier payment. Expiry refunds only the Solana task reward. The operator bears supplier-payment loss.

## Small architecture

- `apps/web`: accessible vanilla TypeScript interface; no framework or wallet required for rehearsal.
- `apps/api`: Express API, one serial worker, SQLite durable jobs, and sponsor adapters.
- `packages/core`: one canonical encoder and verifier shared by API and CRE, plus Node signing and state transitions.
- `programs/orca-orders`: native Rust escrow with fixed payout recipients, quote reservation, one-time settlement and expiry refund.
- `workflows/verify-order`: deterministic CRE workflow; no purchase or irreversible write inside consensus callbacks.
- `scripts`: reproducible builds, wallet setup, deployment, demo and evidence export.

See [architecture and trust boundaries](docs/ARCHITECTURE.md), [live setup](docs/LIVE_SETUP.md), and [submission kit](docs/SUBMISSION.md).

## Deployment

The prepared Sites frontend is owner-private. Its backend is currently a temporary Cloudflare tunnel to the local machine; that service stops if the machine or processes stop. This is not durable judging infrastructure. A Dockerfile is included for an external Node host with a persistent volume for `/data`; set `HOST=0.0.0.0`, a public `PUBLIC_API_URL`, and an exact `CORS_ORIGIN`. The Dockerfile has not been executed in this environment; live operation additionally requires installing official CRE and Bun binaries.

The generated `site/` directory has a separate Sites source checkout. The canonical interface source is `apps/web/`. Do not put API keys or wallets into frontend builds. `.local/`, `.env`, mnemonic files, signed Cardano payloads, and private workflow configs are excluded from source control.

## Scope and license

MIT licensed. There is no autonomous LLM, arbitrary purchasing, bridge, multi-supplier marketplace, production DON deployment, or mainnet asset transfer in this MVP. The agent executes one deterministic reporting task. This keeps spending and verification reviewable within hackathon time. Third-party attribution is in [THIRD_PARTY.md](THIRD_PARTY.md).
