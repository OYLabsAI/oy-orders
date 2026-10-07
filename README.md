# OY Orders

**Give your agent a goal and a budget. It buys the valid deal.**

Open **OY Shop** and give the agent a coffee-pass mission. At a budget of 1 test ADA it stops without creating a purchase. At 2 it compares four OY-operated test offers, catches a price changed after signing, refuses a signed wrong item and an overpriced offer, and selects the matching pass. Let it buy that offer with the funded test wallets. The digital pass is the delivered result. It cannot buy real coffee or admission.

The agent buys the supplier-signed pass on Cardano. An independent Chainlink CRE workflow checks the payment and the promised pass before releasing the Solana task payment. NOWNodes provides the original payment records. The prototype uses separate test-asset funds, official CRE simulation and a trusted settlement relayer. Pass redemption uses a persistent server ledger.

The wallet-report journey and signed-false-answer challenge remain available: a wrong answer keeps its task reward locked, and expiry lets the buyer reclaim that reward. The supplier purchase stays spent.

Built during TOKEN2049 Origins 2026. Main dashboard team: OY Labs. Partner dashboard team: Orca Labs, with the same four members.

[Open the public app](https://oy-orders.vercel.app/) · [Video and downloads](https://oy-orders.vercel.app/deliverables/) · [Native Keynote stage deck](https://drive.google.com/file/d/1yzOd78x3KbnoYOTdTQhAAqMHnr5ersdP/view) · [Executed evidence](docs/evidence/STATUS.md)

Public source: [OYLabsAI/oy-orders](https://github.com/OYLabsAI/oy-orders). Solana program: `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj` on **Devnet**. [Actual shopping settlement](https://explorer.solana.com/tx/4mDHtiBzCamgQGPjRav81AKRk6fUwEdAw6PUoLo94WeUZc9nEnB8jk2hpgRLzEiBGKxwY4a32WUSHgBYJFbbsyNz?cluster=devnet).

The same shopping order paid the supplier 2 tADA on **Cardano preprod**: [`d396b146…56d9a2`](https://preprod.cardanoscan.io/transaction/d396b14691f3319ce6d8b220eafe646433792972f47d3d64427085531956d9a2). [Full payment hash and official CRE execution](docs/evidence/shopping-order.json).

## Try the retail pass

Choose **OY Shop**, set a supplier budget, and click **Find my best deal**. Comparison spends no coins. **Let the agent buy it** creates a separate, authoritative order with signed offers and the budget committed before funding. An operator-funded Solana Devnet wallet locks a 0.01 tSOL agent reward. The worker selects and buys the valid 2 tADA resource on Cardano preprod. Eleven independent checks, including the shopping policy, must pass before settlement and QR issuance. Supplier fees are separate from the price budget. No wallet installation is needed for this funded demo. A persistent global limit defaults to five checkouts per rolling day; the operator can configure 1–10 with `SHOP_DEMO_DAILY_LIMIT` after checking test-wallet balances.

The new shopping purchase passed 11/11 official CRE checks and settled on chain: [execution evidence](docs/evidence/shopping-order.json). [SHOPPING.md](docs/SHOPPING.md) explains the committed decisions. The earlier pass and its used-state commitment survived a controlled cloud-session stop/resume, documented in [RETAIL.md](docs/RETAIL.md). The pass is neither an NFT nor a physical-delivery guarantee.

While you wait, the interface shows the confirmed checkout stage and elapsed time. A missed status response reconnects to the same saved checkout automatically. Reloading restores that checkout; status recovery does not start another purchase. Free offer comparisons and independent checks also show activity and retry interrupted reads.

## Try the checker

Open **Try a fake answer**. Pick Solana or Cardano and a correct fee, a tiny error, or a made-up fee. Every claim receives a valid, separate challenge signature. A fresh official CRE simulation reads the real records again. A false fee fails even when its signature passes; **Now try the correct fee** runs a new independent check.

The challenge needs no wallet, makes no payment and never enters the settlement queue. Its scope is two transaction facts pinned per challenge and a real settled-order reference, not arbitrary truth verification. The **See the demo** tab separately shows genuine paid execution, a controlled signed false report rejected by CRE, and the confirmed refund of that same order's task reward. Recorded proofs remain available when the live API is unavailable.

Twelve genuine paid testnet orders are documented: ten settled, one signed false report was rejected with its reward refunded, and one payment-response-error order expired without delivery and had its separate task reward refunded. Both refunded orders' Cardano supplier payments remain final. The new 89-second movie records actual shopping interaction, a purchase, eleven checks and one-use delivery; confirmation waits are shortened and narration is synthetic. Its successful order needed operator-assisted recovery of the exact already-confirmed Cardano payment after an HTTP402 response, without a second purchase. That response-recovery path is now repaired. Older expired checkouts are excluded from the movie. A separate failed funding attempt had no escrow or supplier purchase and is excluded from the paid count. Exact hashes and limitations are in [evidence/STATUS.md](docs/evidence/STATUS.md).

## Run locally

Requires Node 24 and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm build
pnpm start
```

Open `http://localhost:8787`. The shop requires the live funded setup. For the default **rehearsal**, choose **Wallet report**: use sample wallets and run the simulated success, rejection and expiry scenarios. `pnpm demo` exports those explicitly labeled fixtures. Live payments require funded test wallets and sponsor configuration from [LIVE_SETUP.md](docs/LIVE_SETUP.md). The live challenge requires the recorded reference order to be present in the live database.

```sh
pnpm typecheck
pnpm test
```

69 tests cover signatures, exact receipt/input/payment binding, spending controls, transaction reuse, recovery, the compiled Solana program in LiteSVM, independent source reads, wrong-network rejection, strict CRE/audit result parsing, recovery from pruned source transactions, and interrupted browser polling without duplicate jobs or invented completion. Fixture and VM tests are distinct from public-network execution.

## One task, four necessary integrations

1. **Solana:** 0.01 tSOL in a Devnet order PDA. Immutable terms bind buyer, worker, authority, input, seller, ceiling and expiry. Quote reservation, settlement and refund are enforced by the custom Rust program.
2. **Cardano:** an exact preprod x402 purchase of the selected 2 tADA pass or reporting resource, with a separate 1 tADA network-fee ceiling. The signed payment is persisted before broadcast and reused after an uncertain response.
3. **NOWNodes:** real Solana and Cardano mainnet transaction facts produce the report. NOWNodes preprod reads establish the supplier payment after a network-magic guard.
4. **Chainlink CRE:** independent reads of escrow, payment, configured seller signature and facts precede settlement. Shopping orders add an eleventh check for the committed signed-offer selection. Earlier order simulations have ten checks; the isolated live challenge performs six checks.

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
