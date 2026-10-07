# OY Orders — submission kit

## Deadline and status

**7 October 2026, 23:59 Singapore / 17:59 Berlin.** Internal target: 22:00 Singapore / 16:00 Berlin. The main dashboard team is OY Labs; the inspected NOWNodes team is Orca Labs with the same four members. The product is OY Orders. Main event, Solana, Cardano, Chainlink CRE and NOWNodes are the intended entries. No final submission has been sent.

The public shopping mission is functional. Nine genuine paid testnet orders are documented: eight settled and one signed false reporting delivery rejected with its same-order reward refunded. The new mission passed **11/11** official CRE checks before settling. A one-test-ADA budget was refused without creating an order or funding job. 65 tests passed. The earlier pass survived a controlled persistent-cloud stop/resume. Exact transactions and limits are in [evidence/STATUS.md](evidence/STATUS.md) and [SHOPPING.md](SHOPPING.md).

## Copy-ready description

**Title:** OY Orders

**Tagline:** Your shopping agent. Your budget.

**Problem:** An agent that can pay also needs to obey the customer's goal and spending limit, refuse invalid offers and provide inspectable delivery proof.

**Description:** OY Orders makes this concrete with a coffee-pass mission. Set a supplier-price budget of one test ADA and every offer is refused. At two, the deterministic agent catches a price changed after signing, refuses a signed wrong item and an expensive offer, and selects the valid matching pass. Checkout generates fresh signed offers and commits the goal, budget and full offer set before funding. A Solana Devnet program locks the separate 0.01 tSOL agent reward. The worker purchases the selected pass on Cardano preprod through exact x402. Chainlink CRE independently recomputes the decision and checks the original NOWNodes payment records, supplier signature and committed pass. Eleven checks must pass before the trusted relayer releases the reward. The delivered QR has an atomic server-side one-use record.

**Memorable demo:** Start at one test ADA: no matching offer, no purchase. Change to two: three bad deals refused and the valid offer selected. Let the agent buy it. Show the delivered pass and eleven passed checks with actual Cardano and Solana transaction links. The separate signed-lie challenge catches a tiny false transaction fee despite a valid signature. A different paid reporting order kept its reward locked after rejection and refunded it at expiry.

**Current status:** Actual shopping selection, x402 purchase and settlement; public Vercel app; official CRE simulations; signed rejection and same-order refund; guarded spending and persistent pass use. The catalog is OY-operated with deliberately bad test offers. The agent is deterministic. Operator-funded test coins have no cash value. The pass cannot buy real coffee or entry. No LLM, independent merchant marketplace, currency conversion, NFT, production DON, confidential TEE or customer traction is claimed.

**Business hypothesis:** Agents buying digital benefits from merchants. Test a verification fee per checkout with one merchant pilot, independent seller integration and customer wallet authorization before real funds. No interviews, revenue or partnerships are invented.

## Submission links and fields

- Live app: https://oy-orders.vercel.app/
- Demo and downloads: https://oy-orders.vercel.app/deliverables/
- Cardano demo video: https://oy-orders.vercel.app/downloads/OY-Orders-demo.mp4 — **85.32 seconds**, 1080p H.264/AAC.
- Actual shopping execution: https://oy-orders.vercel.app/api/orders/e63c7700-2bc4-4fe6-adca-a3074149120c/evidence
- GitHub: https://github.com/OYLabsAI/oy-orders — public MIT source repository under the requested organization, with the complete build history. The source ZIP is an additional download.
- Drive native Keynote stage deck: https://drive.google.com/file/d/1yzOd78x3KbnoYOTdTQhAAqMHnr5ersdP/view — six slides with the exact MP4 embedded, full-slide native playback verified, and anyone-with-link read-only access verified. Use this URL in all five presentation fields.
- Drive PPTX: updated six-slide editable backup with its MP4 embedded on slide 3. Native Keynote is the stage file.
- Drive PPT: updated visual backup only. Legacy conversion drops the movie, so it does not satisfy the embedded-demo stage requirement.

Draft fields saved and verified on 7 October: main live URL (1/3); Solana live URL (1/3); NOWNodes live URL and architecture (2/4); CRE live URL and successful official simulation evidence (2/4); Cardano live URL, 85-second hosted video and problem/tools/deployment write-up (3/5). The final GitHub and native Keynote URLs are ready; those draft fields still need to be saved. Draft completion does not mean final submission.

## Track-specific write-up

**Solana:** Our custom native Rust program fixes immutable order PDA terms, the seller quote ceiling, recipient, task payment and deadline. Actual Devnet funding, reservation, settlement and rejection/refund evidence accompany compiled-program LiteSVM tests. Program ID: `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj`. Example retail settlement: [Solana Explorer](https://explorer.solana.com/tx/4mDHtiBzCamgQGPjRav81AKRk6fUwEdAw6PUoLo94WeUZc9nEnB8jk2hpgRLzEiBGKxwY4a32WUSHgBYJFbbsyNz?cluster=devnet). README discloses adapted public dependencies and deployment boundaries.

**Cardano Agentic Commerce:** The deterministic worker selects the cheapest valid signed offer within the committed goal and supplier-price budget, then purchases the pass/report with exact x402 on preprod using Cardano Foundation's x402 SDK 2.26 and Lucid Evolution. It validates network, ADA asset, recipient, amount, expiry and fee before signing. Durable storage saves the signed transaction before broadcast and reuses it after uncertain responses. NOWNodes independently observes the actual supplier payment after verifying network magic 1. The supplier purchase is final; the separate Solana reward is refundable. Official x402-only eligibility does not require a Masumi node or Sokosumi listing. No Cardano smart contract or native-token commerce is claimed. [CARDANO-READINESS.md](CARDANO-READINESS.md) covers tools and scaling.

**Chainlink CRE:** Official CRE orchestration independently checks the expected Solana escrow, external NOWNodes Cardano purchase records, registered Ed25519 signature, receipt digest, immutable input and exact pass commitment. The new shopping execution passed eleven checks before settlement, including recomputation of the committed signed-offer selection. Earlier executions retain ten checks. Reporting and live signed-claim checks also re-fetch multichain source facts. Accepted and rejected official CLI transcripts are included. Qualification uses successful official simulation; production DON and confidential TEE are optional and not claimed. A trusted relayer submits settlement.

**NOWNodes:** `ada-testnet.nownodes.io` supplies independent preprod purchase records using its Blockfrost-compatible API. `sol.nownodes.io` and `ada-blockfrost.nownodes.io` supply both mainnets' reporting and challenge facts, independently re-read by CRE. The Solana escrow itself is Devnet and uses official Devnet RPC; `sol-testnet.nownodes.io` is not relabeled Devnet. [ARCHITECTURE.md](ARCHITECTURE.md) and [RETAIL.md](RETAIL.md) map each endpoint and actual technology role. No keys are in public evidence.

## Three-minute stage pitch

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | Cover | “Tell your agent what you want and what it can spend. It refuses bad deals and buys the valid one.” |
| 0:15–0:30 | Budget comparison | “One test ADA buys nothing. Two buys the genuine coffee pass. Fake prices and wrong items still fail.” |
| 0:30–1:56 | Embedded 85-second demo | Let the recorded budget refusal, selection, actual purchase and verification explain the product. |
| 1:56–2:22 | Four technology roles | “Solana protects the reward. Cardano buys the selected offer. NOWNodes supplies payment records. CRE rechecks the decision and delivery.” |
| 2:22–2:40 | Evidence | “65 tests. 11/11 shopping checks. Nine genuine paid testnet orders. Official simulation and a trusted relayer.” |
| 2:40–3:00 | First market and URL | “Next: one merchant pilot for digital benefits and customer wallet authorization.” |

The MP4 is an **edited tour of authentic app captures with synthetic narration**. The new purchase and the separately labeled signed-lie and paid-refund evidence are genuine. It does not claim a continuous recording of the entire purchase. Stage rules require embedded screen recording and prohibit live demos and external video links. Native Keynote playback is verified; organizer acceptance of the edited capture-tour footage is not claimed.

## Remaining gates and fastest human help

1. GitHub publication and the requested organization transfer are complete: https://github.com/OYLabsAI/oy-orders . Use this canonical URL in all entries.
2. Fill the final GitHub source URL and native Keynote Drive URL into the main entry and all four partner entries. The native deck and its public read-only access are ready.
3. Rehearse the three-minute pitch using the downloaded Keynote deck and its embedded movie. Do not use the movie-free legacy PPT for the stage.
4. The partner dashboard's attendance-confirmed/RSVP-closed 1/2 display is an unconfirmed discrepancy, not a published second-check-in requirement. The main event page explicitly permits relevant partner submissions after applications close. Continue submission; request support only if the actual submission action produces a registration error.
5. Review and submit the main entry and all four partner entries with the user before the deadline. Slides lock at submission. Save each confirmation.

Published technical requirements are covered with testnet funds. Extra mainnet funds, Masumi/Sokosumi registration, NFTs and production CRE are not mandatory for this selected implementation. Deeper Cardano-specific capabilities and genuine merchant validation remain competitive weaknesses. Ask a real merchant one concrete question about vouchers or duplicate redemption if time permits, and record only their actual response.

## Official sources

The five official pages were reread on 7 October 2026: [main event](https://builderbase.com/event/token2049-origins-hackathon), [Solana](https://builderbase.com/track/solana-best-use-of-solana), [Cardano](https://builderbase.com/track/cardano-agentic-commerce), [Chainlink CRE](https://builderbase.com/track/chainlink-best-workflow-with-cre), [NOWNodes](https://builderbase.com/track/nownodes-multichain-infrastructure-challenge). [TRACK-READINESS.md](TRACK-READINESS.md) contains the exact eligibility matrix, rubric weights and remaining gates. Prize outcomes remain the judges' decision.
