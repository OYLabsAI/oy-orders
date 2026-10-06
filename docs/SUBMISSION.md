# Orca Orders — submission and winning plan

## Deadline and present status

Official deadline: **7 October 2026, 23:59 Singapore (GMT+8), 17:59 Berlin**. Internal upload target: **22:00 Singapore / 16:00 Berlin**. The project now has four actual settled orders across all four partners, a genuine expiry refund and an interactive one-fee tamper replay. Account/funding prerequisites are complete. Judge access, durable hosting, partner check-in status and stage-format compatibility remain the submission gates.

Team: Orca Labs. Dashboard confirmed participation in the main TOKEN2049 Origins event and NOWNodes, Solana, Cardano and Chainlink partner tracks. Main check-ins showed 2/2; partner check-ins showed 1/2. That discrepancy needs resolution through the team dashboard or event help desk. No message has been sent on the team's behalf.

## Priority execution schedule

| Singapore time | Work | Completion gate |
|---|---|---|
| Oct 6, first 2 hours after handoff | Finish account prerequisites, testnet funding and program deployment | Genuine program ID, NOWNodes key, Cardano preprod funds, CRE login |
| Oct 6, next 3 hours | One actual successful end-to-end order | Real x402 payment + both NOWNodes reads + successful CRE simulation + Solana settlement |
| Oct 6, next 2 hours | Rejection and real expiry/refund demonstrations; restart rehearsal | Protected escrow on rejection, genuine refund, no duplicate purchase |
| Oct 6 evening | Freeze scope; capture <=3-minute live demo; replace rehearsal clip in deck | Every claim traceable to exported evidence and explorers |
| Oct 7 morning | Publish MIT GitHub source and stable demo; validate fresh-browser judging | A judge can follow README and demo without the team's machine |
| Oct 7 afternoon | Upload supported deck to Drive, check video playback and access, final track-specific text | Correct audience, file format, embedded recording, all track selections |
| Oct 7 22:00 | Submit together from the dashboard | Submission receipt saved; two-hour buffer remains |

The first gate has priority over extra features: a functional live vertical slice scores across every sponsor. If a sponsor cannot be activated, retain the implemented adapter and disclose the missing execution. No decorative feature can substitute for eligibility evidence.

## Rubric mapped to concrete proof

| Entry | What judges should see | Evidence to attach |
|---|---|---|
| Main Origins | Complete task flow and failure case; each sponsor has a necessary role; bounded spending solves a clear user problem | Stable demo, architecture, six-slide pitch, source and execution evidence |
| Solana | A deployed custom program with meaningful funding, quote reservation, immutable destinations, one-time settlement and expiry refunds | Devnet program ID, source, actual funding/reservation/settlement/refund explorer links; LiteSVM tests as supporting evidence |
| Cardano Agentic Commerce | The agent handles a real HTTP 402, signs an exact preprod ADA payment within a cap, obtains a receipt and completes a useful paid task | Actual payment hash/output/fee, x402 challenge and signed receipt, open-source documented repo, <=3-minute recording, write-up |
| Chainlink CRE | The workflow independently verifies actual escrow, payment and facts; its result controls the task reward | Successful official CLI simulation transcript, workflow source/config template, accepted and rejected checks; local simulation/trusted relayer disclosure |
| NOWNodes | Genuine Solana and Cardano API data are essential to a useful report and verification | Redacted request methods and responses, node configuration, report facts, independent re-fetch; no API keys in attachments |

Main weighting: functionality 30%, integration 25%, innovation 20%, usefulness 15%, demo 10%. Solana: technical 30%, innovation 20%, UX 20%, viability 15%, demo 15%. Cardano: technical 30%, innovation 20%, UX 20%, impact 20%, pitch 10%. Chainlink: blockchain 40%, CRE 40%, WOW 20%. NOWNodes: completeness 25%, infrastructure 25%, usefulness 20%, creativity 15%, scalability 15%.

The shared differentiator is **a paid agent task that can fail safely**. Show the tampered-result rejection as the memorable moment. Explain why a seller signature alone is insufficient and why the CRE workflow re-fetches the facts. Show the cap before the payment, then the evidence before the reward.

## Copy-ready project description

**Title:** Orca Orders

**Tagline:** Give your agent a job. Keep control of the spend.

**Description:** Orca Orders gives operators a bounded, auditable way to buy a blockchain reporting task. A buyer funds a Solana task escrow, the agent reserves a Cardano service quote and handles an x402 payment, and a signed report is independently checked before the task reward is released. NOWNodes supplies confirmed transaction facts from Solana and Cardano. A Chainlink CRE workflow verifies the escrow terms, payment recipient and value, seller signature, report digest, and factual provenance. Incorrect reports retain the escrow reward; expiry returns that reward to the buyer. The MVP uses separate Solana Devnet and Cardano preprod test assets, with no bridge or exchange-rate conversion.

**Current status:** Four paid testnet orders have settled through the deployed Solana program, Cardano preprod x402, real NOWNodes data and successful official CRE CLI simulations. A separate actual expiry refund passes. The demo challenge replays a genuine signed report locally: changing one fee preserves the signature but fails integrity/provenance. The prototype uses a trusted simulation relayer; no DON deployment is claimed. See evidence/STATUS.md and evidence/live-order.json for exact transaction hashes.

**Why now:** Agents can discover services and pay for them, but an operator also needs to constrain spending and verify the deliverable. This prototype makes that contract concrete for one inspectable task.

**Technical novelty:** Quote reservation and report/payment binding connect the service purchase to immutable escrow terms. The workflow rejects a report with a valid seller signature when independently observed facts disagree. The program protects fixed recipients and mutually exclusive settlement/refund states.

**Business model hypothesis:** Blockchain operations teams pay a per-task execution/verification fee or a subscription for recurring reports. This is a hypothesis, not validated revenue or user research. First interviews should test how those teams approve agent budgets, investigate reporting errors, and value audit evidence.

## Track-specific write-ups

**Solana:** Our native Rust program implements an order PDA with immutable task terms, a seller quote reservation within a ceiling, fixed worker payout, and buyer expiry refund. It rejects unauthorized authorities, destination substitution, quote changes, repeated settlement/refund, and counterfeit PDA accounts. Actual deployment, funding, reservation, settlement and expiry-refund evidence is included.

**Cardano:** The deterministic agent buys one reporting resource through the exact Cardano x402 scheme on preprod. It validates the accepted network, ADA asset, supplier, amount, expiry and decoded transaction fee before broadcasting. Durable storage retains the signed transaction for recovery. The signed receipt binds the paid service to the escrow order. Supplier payment is final; only the independent task reward is refundable.

**Chainlink:** The CRE cron workflow independently derives the expected Solana order PDA, checks account ownership and immutable terms, observes the preprod payment, verifies the configured Ed25519 seller signature, and re-fetches both chains' facts through NOWNodes. It uses deterministic runtime time and consensus aggregation for reads. The demo's trusted relayer consumes a local simulation result; no production DON deployment or trustless authorization is claimed.

**NOWNodes:** The same report uses Solana JSON-RPC and Cardano Blockfrost endpoints, and the verifier repeats those reads independently. This gives the infrastructure two essential roles: producing the paid report and checking it. The record must contain actual sponsor requests; public RPC probes and rehearsal fixtures do not qualify.

## Three-minute demo script

| Time | Show | Say |
|---|---|---|
| 0:00–0:20 | Task form, visible execution mode | “An agent needs permission to spend and evidence that the paid task was done.” |
| 0:20–0:45 | Reward, service cap, deadline | “The task reward and the Cardano supplier payment are separate. The quote and fee limits are checked before signing.” |
| 0:45–1:25 | Success trace and actual explorer evidence when available | “The agent handles the 402, receives the report, and the workflow independently verifies its payment and facts.” |
| 1:25–2:00 | Signed receipt and checks | “A signature binds the claim; independent reads establish whether it is true.” |
| 2:00–2:30 | Tampered report rejection | “Changing one transaction fee causes rejection. The task reward stays in escrow.” |
| 2:30–2:45 | Expiry refund | “The buyer can reclaim the reward after the deadline. The supplier payment itself is final.” |
| 2:45–3:00 | Source and architecture | “One bounded task, four necessary integrations, inspectable evidence.” |

Introduce the new proof-tour recording as: **“These are actual testnet order proofs. The tamper challenge is a local replay of saved evidence.”** The earlier rehearsal movie stays separately labeled.

## Submission gates

- Main plus all four partner tracks selected in the submission dashboard.
- Resolve the partner check-in discrepancy and re-read actual dashboard status.
- MIT source in an accessible Git repository with lockfile, setup and trust assumptions.
- Judges can run the demo unaided; private Sites access and a temporary local tunnel are not sufficient by themselves.
- Cardano demo <=3 minutes; video links play without requesting account access.
- Stage deck linked from Drive as the requested `.ppt` or `.keynote` file. A Google Slides, Gamma or site link is not the stage-deck deliverable. Genuine `.ppt` export is provided separately from `.pptx`; verify embedded movie behavior in the exact submitted format.
- Stage technical demo is a recording embedded in the deck; do not rely on live technical demo access. Deck locks at submission.
- Correct network/cluster labels; actual explorer links for every cited transaction; redact API keys.
- Each text distinguishes source/VM testing, workflow compilation, real simulation and actual deployment.
- Save the final submission confirmation and all links before the deadline.

## Official event sources

- https://builderbase.com/event/token2049-origins-hackathon
- https://builderbase.com/track/nownodes-multichain-infrastructure-challenge
- https://builderbase.com/track/solana-best-use-of-solana
- https://builderbase.com/track/cardano-agentic-commerce
- https://builderbase.com/track/chainlink-best-workflow-with-cre

These reflect the event dashboard and rules reviewed during this session. Re-read the dashboard for changes before final submission. No prize outcome is guaranteed.


## Memorable demo moment

Show the four proof cards first, then the matching hashes. Say: “A valid signature can still accompany the wrong answer.” Click **Alter one fee +1**. Seller signature stays green while integrity and provenance turn red. Read **REJECTED COPY** aloud, then restore. Explain that this safe local replay changes no chain state, while the actual CRE transcript above independently re-fetched both networks. Finish with the real settlement and expiry-refund explorer links.


## Exact live proof links

Program: https://explorer.solana.com/address/2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj?cluster=devnet

Latest settled order: `905ca8fe-3593-409f-88d3-5488d89dec09`.

- fundingTx: https://explorer.solana.com/tx/2fGnd2nRV45VWde8Fxnsj9DdqrJgJdZronWEYUKzKVdb5b7AWJMASGaDHzhss1EFqHmS3Lu5mHjeCTibTGh9dHq1?cluster=devnet
- reserveTx: https://explorer.solana.com/tx/3TKBB3eSivYSTaomj4iirbcYyvETX24gd1HXWYyv3tABgydRvYwTxZQwy1X6P1xEVuXthd6y89PF24P6aCGcvAtP?cluster=devnet
- settleTx: https://explorer.solana.com/tx/3FcE6xE3s3FPjFS7LL6XZnQchzBqM1SH2gda8rNJwxmCP8LTcbmu2xdH1pWTyU9tecPtmwyu7H6gnsQq4bXEXHGU?cluster=devnet

Cardano purchase: https://preprod.cardanoscan.io/transaction/9a3b35a72cb5fdeeb8ca687e33ffb32a6d8b8819d96a3e8e1eff7afd5a073ca4

Actual expiry refund: https://explorer.solana.com/tx/2AYjW6zkCfTbcnwRTfgghWkQrK59A5PHvrKFZcJkfMyG27p8aq66vbqPmefwRp8ytQsVAU52oREPEv3z4WEpvtpQ?cluster=devnet

## Latest NOWNodes preprod proof

Order `8456603d-6318-4a72-a403-af2c992cc84a` completed without operator recovery. Both worker and CRE used NOWNodes preprod transaction outputs after verifying network_magic=1. Its official simulation passed all ten checks.

- [Solana funding](https://explorer.solana.com/tx/2XoNQ2afih4XTKs1FY9tiVRTKfFHAggfhZ3FifRmfgqEnngXsBdqHrBzuFXwCm5koxXY4MqrKkjiS1ZZc8GnEtiK?cluster=devnet)
- [Solana settlement](https://explorer.solana.com/tx/gwbnK55qnZJpjjx1zZ12XTCUsVbCr5d6ZqsXNTuio9R3FHBx87GPtPLn1b4GB1xgH5J93uLY8iDJGwUXkb9XEqW?cluster=devnet)
- [Cardano supplier payment](https://preprod.cardanoscan.io/transaction/5bbf93b751ea2c005e21e972e191dc3d2f2a18481e1a5a9d6fda06c845e662a7)

For a network outage, choose **Explore verified demo**. Its historical proof, local challenge, evidence export and separate expiry refund remain usable without the local service; new orders stay disabled while offline.
