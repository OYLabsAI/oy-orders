# OY Orders — submission kit

## Deadline and status

**7 October 2026, 23:59 Singapore / 17:59 Berlin.** Internal target: 22:00 Singapore / 16:00 Berlin. The main dashboard team is OY Labs; the inspected NOWNodes team is Orca Labs with the same four members. The product is OY Orders. Main event, Solana, Cardano, Chainlink CRE and NOWNodes are the intended entries. No final submission has been sent.

The public retail prototype is functional. Eight genuine paid testnet orders are documented: seven settled; one signed false reporting delivery was rejected and its same-order reward refunded. The retail order passed 10/10 official CRE checks. Its first cashier scan was accepted and reuse refused; persistent cloud stop/resume preserved payment and redemption records. 57 tests passed. Exact transactions are in [evidence/STATUS.md](evidence/STATUS.md), [evidence/retail-pass.json](evidence/retail-pass.json) and [evidence/retail-persistence.json](evidence/retail-persistence.json).

## Copy-ready description

**Title:** OY Orders

**Tagline:** A coffee. A click. A little crypto magic.

**Problem:** Agent payments need an understandable customer experience and inspectable proof that the purchased deliverable matches the promised one.

**Description:** OY Orders makes that idea concrete with a digital coffee-style pass. A funded test wallet locks 0.01 tSOL in our deployed Solana program. An agent uses separate Cardano preprod funds to purchase a supplier-signed pass through exact x402. Chainlink CRE independently checks the escrow, actual supplier payment, signature and committed pass before a trusted relayer releases the task reward. The QR appears after confirmed settlement. The shop accepts its first use and refuses a second use through an atomic persistent server record. All assets are test coins; this voucher cannot buy real coffee or entry. There is no currency conversion, bridge, NFT or on-chain pass redemption.

**Memorable demo:** Buy the pass, show its QR, accept the first use, try the same pass again. Then open the actual payment proof. The separate signed-lie challenge lets judges change a transaction fee and see a valid signature pass while fresh source checks catch the wrong number. A different real paid reporting order proves that a rejected delivery keeps the task reward locked until its expiry refund. Challenge clicks do not move assets.

**Current status:** Real retail payment and one-use pass, public cloud app, official CRE simulations, actual signed rejection/refund evidence, guarded spending and persistent recovery. No production DON, confidential TEE, merchant acceptance, customer traction or independent supplier operation is claimed.

**Business hypothesis:** Start with digital vouchers that merchants can verify. Test a verification fee per checkout with one real merchant pilot. Validate wallet onboarding, supplier cost and customer demand before real assets. No interviews, revenue or partnerships are invented.

## Submission links and fields

- Live app: https://oy-orders.vercel.app/
- Demo and downloads: https://oy-orders.vercel.app/deliverables/
- Cardano demo video: https://oy-orders.vercel.app/downloads/OY-Orders-demo.mp4 — **87.28 seconds**, 1080p H.264/AAC.
- Actual retail execution: https://oy-orders.vercel.app/api/orders/29ab7330-93fa-4aef-b74e-02bca9495b3a/evidence
- GitHub: https://github.com/nknwn-eth/oy-orders — public repository created; source upload awaits local CLI authorization. The public MIT source ZIP is a fallback, not a substitute for the required GitHub repository.
- Drive PPTX: updated six-slide editable deck with its MP4 embedded on slide 3. Published rules list `.ppt` or Keynote; PPTX acceptance remains unconfirmed.
- Drive PPT: updated visual backup only. Legacy conversion drops the movie, so it does not satisfy the embedded-demo stage requirement.

Draft fields saved and verified on 7 October: main live URL (1/3); Solana live URL (1/3); NOWNodes live URL and architecture (2/4); CRE live URL and successful official simulation evidence (2/4); Cardano live URL, 87-second hosted video and problem/tools/deployment write-up (3/5). GitHub and stage-deck fields are intentionally blank until their actual requirements are met. Draft completion does not mean final submission.

## Track-specific write-up

**Solana:** Our custom native Rust program fixes immutable order PDA terms, the seller quote ceiling, recipient, task payment and deadline. Actual Devnet funding, reservation, settlement and rejection/refund evidence accompany compiled-program LiteSVM tests. Program ID: `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj`. Example retail settlement: [Solana Explorer](https://explorer.solana.com/tx/2Xp7pF7NEptyCrEW12txmC1u9Rx8gBB6mpSyNSAF4vzELnsmuvZfbxE6DuXLRDKc8rcF6X4VyV73Nde4xsA9D66o?cluster=devnet). README discloses adapted public dependencies and deployment boundaries.

**Cardano Agentic Commerce:** The deterministic worker purchases the signed pass/report with exact x402 on preprod using Cardano Foundation's x402 SDK 2.26 and Lucid Evolution. It validates network, ADA asset, recipient, amount, expiry and fee before signing. Durable storage saves the signed transaction before broadcast and reuses it after uncertain responses. NOWNodes independently observes the actual supplier payment after verifying network magic 1. The supplier purchase is final; the separate Solana reward is refundable. Official x402-only eligibility does not require a Masumi node or Sokosumi listing. No Cardano smart contract or native-token commerce is claimed. [CARDANO-READINESS.md](CARDANO-READINESS.md) covers tools and scaling.

**Chainlink CRE:** Official CRE orchestration independently checks the expected Solana escrow, external NOWNodes Cardano purchase records, registered Ed25519 signature, receipt digest, immutable input and exact pass commitment. The real retail execution passed ten checks before settlement. Reporting and live signed-claim checks also re-fetch multichain source facts. Accepted and rejected official CLI transcripts are included. Qualification uses successful official simulation; production DON and confidential TEE are optional and not claimed. A trusted relayer submits settlement.

**NOWNodes:** `ada-testnet.nownodes.io` supplies independent preprod purchase records using its Blockfrost-compatible API. `sol.nownodes.io` and `ada-blockfrost.nownodes.io` supply both mainnets' reporting and challenge facts, independently re-read by CRE. The Solana escrow itself is Devnet and uses official Devnet RPC; `sol-testnet.nownodes.io` is not relabeled Devnet. [ARCHITECTURE.md](ARCHITECTURE.md) and [RETAIL.md](RETAIL.md) map each endpoint and actual technology role. No keys are in public evidence.

## Three-minute stage pitch

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | Beautiful pass cover | “Buy a digital pass with crypto. Show it once. Try it twice. The shop catches reuse.” |
| 0:15–0:30 | Simple checkout | “An agent buys the pass. Independent checks compare the payment and exact promised pass before payout.” |
| 0:30–1:57 | Embedded 87-second demo | Let the recorded retail, duplicate scan, signed-lie and separate refund evidence tell the story. |
| 1:57–2:22 | Four technology roles | “Solana protects the reward. Cardano buys the pass. NOWNodes provides the payment records. CRE checks them independently.” |
| 2:22–2:40 | Evidence | “57 tests, 10/10 retail checks, eight real paid testnet orders. This prototype uses simulation and a trusted relayer.” |
| 2:40–3:00 | First market and URL | “Next: one merchant pilot for digital vouchers, wallet onboarding and a fee-per-checkout hypothesis.” |

The MP4 is an **edited authentic-screen tour with synthetic narration**. It includes an actual duplicate-check screen recording and historical genuine accepted-use/payment/refund captures. It does not claim a continuous recording of the full purchase. The stage rules prohibit live demos and external video links: play the embedded recording. Native Keynote/PowerPoint playback is still unverified.

## Remaining gates and fastest human help

1. Complete the local GitHub CLI device approval to push the audited source/history. The requested organization transfer was attempted, but GitHub could not find `oylabs`; its exact public URL is 404 and `nknwn-eth` has no organization memberships. The repository remains at `nknwn-eth/oy-orders`. Supply the exact organization URL and sign in with permission to create repositories there.
2. Ask the on-site organizer to repair all four partner RSVP/check-in records. Main shows 2/2; every partner shows attendance confirmed but RSVP closed and unchecked (1/2). The UI offers no self-service repair.
3. Click Continue in Keynote personally if you accept its Software License Agreement. Then convert and verify the embedded movie in native Keynote, or obtain explicit organizer acceptance of the existing PPTX. Do not submit the movie-free legacy PPT as compliant.
4. Read-only link access is now verified for the updated Drive PPTX, MP4 and source ZIP. The final native Keynote deck will need the same judge access. Public Vercel downloads do not replace the required Drive stage-deck link.
5. Review and submit the main entry and all four partner entries with the user before the deadline. Slides lock at submission. Save each confirmation.

Published technical requirements are covered with testnet funds. Extra mainnet funds, Masumi/Sokosumi registration, NFTs and production CRE are not mandatory for this selected implementation. Deeper Cardano-specific capabilities and genuine merchant validation remain competitive weaknesses. Ask a real merchant one concrete question about vouchers or duplicate redemption if time permits, and record only their actual response.

## Official sources

The five official pages were reread on 7 October 2026: [main event](https://builderbase.com/event/token2049-origins-hackathon), [Solana](https://builderbase.com/track/solana-best-use-of-solana), [Cardano](https://builderbase.com/track/cardano-agentic-commerce), [Chainlink CRE](https://builderbase.com/track/chainlink-best-workflow-with-cre), [NOWNodes](https://builderbase.com/track/nownodes-multichain-infrastructure-challenge). [TRACK-READINESS.md](TRACK-READINESS.md) contains the exact eligibility matrix, rubric weights and remaining gates. Prize outcomes remain the judges' decision.
