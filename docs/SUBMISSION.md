# OY Orders — submission kit

## Deadline and status

Official deadline: **7 October 2026, 23:59 Singapore / 17:59 Berlin**. Internal target: **22:00 Singapore / 16:00 Berlin**. Team remains **Orca Labs**; product is **OY Orders**. Main event plus Solana, Cardano, Chainlink CRE and NOWNodes tracks are the intended entries. No hackathon submission has been sent.

Seven paid testnet orders are documented: six settled; one validly signed false report was rejected and the same order's reward refunded. A fresh cloud order completed without intervention. The public Vercel app, live signed-claim challenge and controlled cloud stop/resume are verified. [Evidence](evidence/STATUS.md) has exact hashes; [track readiness](TRACK-READINESS.md) distinguishes eligibility from competitive gaps.

GitHub authentication/publication, Drive judge access, prior partner check-in 1/2 discrepancy, and stage-format/movie playback remain gates. Main check-in previously showed 2/2. Re-read actual dashboard status before submitting; no organizer messages have been sent.

## Copy-ready description

**Title:** OY Orders

**Tagline:** A signed answer can still be wrong. Proof before payday.

**Description:** OY Orders gives blockchain operations teams a bounded, auditable way to buy a wallet-reporting task. A buyer locks a Solana task reward; an agent reserves a Cardano service quote and handles an exact x402 payment. NOWNodes supplies transaction facts from both chains. A Chainlink CRE workflow independently verifies the escrow terms, actual supplier payment, registered seller signature, report digest and source facts before a trusted prototype relayer releases the task reward. A false report keeps the reward locked; expiry returns that reward to the buyer. The Cardano supplier payment is final. This MVP uses separate Solana Devnet and Cardano preprod test assets, without a bridge or conversion.

**Memorable feature:** Judges can try to fool a real verifier. Choose a network and a tiny or large false fee claim. The claim receives a valid dedicated challenge signature, but fresh independent CRE reads catch the disagreement. The corrected-answer button runs a new independent check. This isolated audit needs no wallet or charge and never changes a paid order. Separate actual paid rejection/refund evidence proves money protection.

**Current status:** Six paid orders settled through the custom Solana program, genuine Cardano x402, NOWNodes and official CRE simulations. One controlled supplier's signed false report failed provenance and its same-order reward was refunded. The latest success ran through Vercel without operator recovery; persistent session stop/resume preserved the completed order and audit. 49 tests pass. No production DON, TEE deployment, general truth oracle or customer traction is claimed.

**Why now:** Agents can pay for services, but operators still need spending limits and evidence that the deliverable is correct. OY Orders makes that contract concrete for one inspectable task.

**Business hypothesis:** A per-task verification fee or team subscription for recurring blockchain operations reports. Validate reporting errors, approval budgets and audit costs with actual operators. No interviews, revenue or partnerships are claimed.

## Track-specific text

**Solana:** A native deployed Rust program implements immutable order PDA terms, reserved seller quote within a ceiling, fixed payout and buyer expiry refund. Ownership/PDA/signer/destination/state/deadline checks enforce mutually exclusive settlement/refund. Actual funding, reservation, settlement and refund evidence and compiled-ELF LiteSVM tests are included. Devnet program: `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj`.

**Cardano Agentic Commerce:** A deterministic agent buys a useful reporting resource through exact Cardano x402 on preprod. Network, ADA asset, supplier, amount, expiry and transaction fee are checked before signing. Private durable storage preserves the signed payment before broadcast; uncertain responses reuse that same transaction. The signed receipt binds purchase to order. Official rules permit x402 alone; Masumi escrow/Sokosumi listing are not claimed. Direct supplier payment is final; the separate task reward is refundable. See [Cardano readiness](CARDANO-READINESS.md).

**Chainlink CRE:** The workflow independently derives and reads the expected Solana escrow, observes the preprod purchase, verifies the configured Ed25519 signature and re-fetches multichain facts. A valid signature cannot override failed provenance. Successful official CLI simulations and real accepted/rejected transcripts are included. The live isolated audit gives judges a fresh false/corrected comparison. Simulation plus a trusted relayer is explicit; production DON/TEE deployment is not claimed.

**NOWNodes:** Real Solana JSON-RPC and Cardano Blockfrost-compatible facts produce the paid report; CRE independently repeats both reads. NOWNodes preprod outputs prove the supplier payment after network_magic=1 verification. The sponsor infrastructure is necessary to both producing and checking the work. Endpoint roles and redacted execution evidence are included; no keys are attached.

## Three-minute pitch

| Time | Show | Say |
|---|---|---|
| 0:00–0:20 | Cover and claim/actual slide | “A signed answer can still be wrong. Who checks it before your agent pays?” |
| 0:20–1:53 | Embedded 93-second edited proof tour | Show the real success, fresh signed lie, corrected check, and separate paid rejection/refund. Let narration explain. |
| 1:53–2:20 | Four sponsor roles | “Solana protects the reward. Cardano buys the report. NOWNodes supplies the facts. CRE checks them independently.” |
| 2:20–2:40 | Evidence slide | “49 tests, real testnet payments, inspectable proof and a cloud demo. CRE is a simulation with a trusted prototype relayer.” |
| 2:40–3:00 | Use case and public URL | “We start with repeatable wallet reports for blockchain operations teams. Next, validate real reporting errors and recurring budgets.” |

The video is an **edited authentic screenshot tour with synthetic narration**, not continuous execution footage. Live challenge clicks perform fresh reads; the recorded money-protection story shows an actual earlier payment/refund. Do not claim challenge clicks move money. Stage rules require the technical demo recording in the deck; use the recording for the stage pitch and the live challenge for judge interaction if permitted.

## Rubrics and remaining plan

Main weights: functionality 30%, integration 25%, innovation 20%, usefulness 15%, demo 10%. Solana: technical 30%, innovation 20%, UX 20%, viability 15%, demo 15%. Cardano: technical 30%, innovation 20%, UX 20%, impact 20%, pitch 10%. CRE: blockchain 40%, CRE 40%, WOW 20%. NOWNodes: completeness 25%, infrastructure 25%, usefulness 20%, creativity 15%, scalability 15%.

The strongest case is now a judge-controlled fresh audit connected to actual protected-money evidence. Do not add a decorative fifth integration. Use remaining time for repository/access, stage playback, three actual operator conversations, a timed pitch rehearsal and final submission. [TRACK-READINESS.md](TRACK-READINESS.md) contains the full schedule and competitive gaps.

## Final gates

- Public app/video/downloads load from a logged-out device. Recorded fallback is always available.
- MIT source in a judge-accessible GitHub repository; the ZIP is only a fallback.
- Drive deck/video permissions let judges open them. Existing files currently remain owner-only.
- Confirm acceptance and native playback of the MP4 embedded in PPTX. The requested legacy `.ppt` visual backup loses the movie; no native PowerPoint/Keynote playback is claimed.
- Re-check partner check-ins and all intended track selections.
- Verify exact final links, source, network labels and trust disclosures. No credentials in submission assets.
- Submit together before the internal target and save the confirmation. The deck locks at submission.

## Official sources

[Main event](https://builderbase.com/event/token2049-origins-hackathon), [Solana](https://builderbase.com/track/solana-best-use-of-solana), [Cardano](https://builderbase.com/track/cardano-agentic-commerce), [Chainlink CRE](https://builderbase.com/track/chainlink-best-workflow-with-cre), [NOWNodes](https://builderbase.com/track/nownodes-multichain-infrastructure-challenge). Rules were read during this session; re-check the dashboard for changes before submission. Winning remains a judging decision.

## Plain-language explanation

“Imagine paying a worker to check a set of transactions. What if their report makes up a number? OY holds their reward until a separate checker compares the answer with the original records. Correct work gets paid. Wrong work keeps the reward locked, and the buyer can reclaim it after the deadline. The report’s purchase fee is separate and stays spent. Today’s demo uses an automated reporting worker and test coins.”

Demo route: **See the demo** shows completed correct-work, rejected-work and refund examples. **Try a fake answer** checks a newly signed fee claim against fresh records for free. **How it works** explains the two costs; sponsor connections and verification details are expandable. Fees are displayed in SOL or ADA with enough precision to show a smallest-unit error.
