# OY Orders

**A signed answer can still be wrong. Proof before payday.**

Built by Orca Labs for TOKEN2049 Origins 2026. A buyer locks a Solana task reward, an agent buys a Cardano x402 reporting resource, and Chainlink CRE independently checks NOWNodes facts before a trusted prototype relayer releases the reward.

[Open the public app](https://oy-orders.vercel.app/) · [Video, pitch and source downloads](https://oy-orders.vercel.app/deliverables/) · [Executed evidence](docs/evidence/STATUS.md)

## Try the memorable part

Open **Try to fool it**. Pick Solana or Cardano and an honest claim, a tiny lie, or a big lie. Every claim receives a valid, separate challenge signature. A fresh official CRE simulation reads the real records again. A false fee fails even when its signature passes; **Try the corrected answer** runs a new independent check.

The challenge needs no wallet, makes no payment and never enters the settlement queue. Its scope is two transaction facts pinned per challenge and a real settled-order reference, not arbitrary truth verification. The **Demo** tab separately shows genuine paid execution, a controlled signed false report rejected by CRE, and the confirmed refund of that same order's task reward. Recorded proofs remain available when the live API is unavailable.

Seven genuine paid testnet orders are documented: six settled and one rejected with its reward refunded. The latest fresh order executed entirely through the Vercel backend without operator recovery. A controlled session stop/resume preserved its state and a completed challenge. Exact hashes and limitations are in [evidence/STATUS.md](docs/evidence/STATUS.md).

## Run locally

Requires Node 24 and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm build
pnpm start
```

Open `http://localhost:8787`. The default mode is **rehearsal**: use sample wallets and run the simulated success, rejection and expiry scenarios. `pnpm demo` exports those explicitly labeled fixtures. Live payments require funded test wallets and sponsor configuration from [LIVE_SETUP.md](docs/LIVE_SETUP.md). The live challenge requires the recorded reference order to be present in the live database.

```sh
pnpm typecheck
pnpm test
```

49 tests cover signatures, exact receipt/input/payment binding, spending controls, transaction reuse, recovery, the compiled Solana program in LiteSVM, independent source reads, wrong-network rejection, strict CRE/audit result parsing, and recovery from pruned source transactions. Fixture and VM tests are distinct from public-network execution.

## One task, four necessary integrations

1. **Solana:** 0.01 tSOL in a Devnet order PDA. Immutable terms bind buyer, worker, authority, input, seller, ceiling and expiry. Quote reservation, settlement and refund are enforced by the custom Rust program.
2. **Cardano:** an exact preprod x402 purchase of a 2 tADA reporting resource, with a separate 1 tADA network-fee ceiling. The signed payment is persisted before broadcast and reused after an uncertain response.
3. **NOWNodes:** real Solana and Cardano mainnet transaction facts produce the report. NOWNodes preprod reads establish the supplier payment after a network-magic guard.
4. **Chainlink CRE:** independent reads of escrow, payment, configured seller signature and facts precede settlement. Actual authenticated CLI simulations pass ten order checks; the isolated live challenge performs six checks.

Supplier payment and task reward are separate test-asset payments. Cardano payment is final; expiry refunds only the Solana task reward. There is no bridge, conversion or atomic cross-chain settlement.

## Small architecture

- `apps/web`: accessible vanilla TypeScript interface and recorded fallback.
- `apps/api`: Express, SQLite WAL/jobs, one order worker and isolated bounded challenge queue.
- `packages/core`: canonical encoding and pure verification shared with CRE.
- `programs/orca-orders`: native Rust escrow and tested compiled ELF. The internal name stays unchanged to preserve the deployed binary.
- `workflows/verify-order`: deterministic CRE reads and verification; no payment inside consensus callbacks.
- `hosting/vercel`: restricted API proxy, persistent startup and pinned Linux runtime installation.
- `scripts`: reproducible setup, deployment, actual demos and evidence export.

See [architecture](docs/ARCHITECTURE.md), [cloud deployment](docs/VERCEL.md), [submission kit](docs/SUBMISSION.md) and [track readiness](docs/TRACK-READINESS.md).

## Hosting and trust

The public frontend and API run on Vercel. Private state and keys use a persistent Sandbox with Vercel Drive; stopped sessions resume on request. A paid cloud order and a controlled persistence check passed. Hobby cold starts, session limits and free quotas apply; this is not a production availability guarantee.

CRE runs as an official CLI simulation, not a deployed DON. The relayer, operator-controlled seller and NOWNodes are prototype trust assumptions. A compromised settlement authority could bypass local verification. Production should bind DON-authorized results on chain and separate custody and operators.

Deploy only the isolated `.local/vercel-release`, never the repository root. `.env`, `.local`, mnemonic/key files, signed private payment payloads, credentials and the database are excluded from public source/static uploads. Use operator-owned test wallets and non-sensitive public wallet inputs only.

MIT licensed; dependencies are credited in [THIRD_PARTY.md](THIRD_PARTY.md). No autonomous LLM, unrestricted purchasing, multi-seller marketplace, mainnet asset transfer, customer traction or prize outcome is claimed.
