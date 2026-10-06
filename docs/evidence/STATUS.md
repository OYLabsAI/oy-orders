# Executed evidence — 6 October 2026

**Four genuine paid testnet orders settled across all four sponsors.** The interactive challenge replays genuine signed evidence locally; it makes no new purchase and preserves the original order.

| Evidence | Executed result | Practical limit |
|---|---|---|
| TypeScript and tests | Root type check passes; 40 tests pass | Local VM, fixtures, CLI parsing and genuine receipt replay |
| Solana program | Devnet `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj` deployed; on-chain bytes match tested ELF | Operator retains upgrade authority |
| Paid orders | Real funding, reservation, 2 tADA purchase and reward settlement | Separate test assets; no bridge or conversion |
| Cardano x402 | Confirmed supplier outputs and actual fees | Koios signer; NOWNodes preprod payment proof with network guard; Blockfrost optional |
| NOWNodes | Actual Solana and Cardano mainnet facts, independently re-fetched by CRE | Public sample addresses include a Solana vote account |
| Chainlink CRE | Official authenticated CLI simulations passed ten checks | Local simulation and trusted relayer; no production DON |
| Recovery | Truncated CLI output and upstream failures recovered without duplicate purchases | Operator retries reused saved transactions/receipts; histories preserved |
| Actual expiry refund | Direct program probe returned 0.01 tSOL after a 90-second deadline | Product UI retains 15 minutes; no Cardano purchase in this probe |
| Interactive challenge | +1 fee preserves signature but fails integrity and provenance; restore passes | Local replay at saved verification time |
| Frontend | One-click saved evidence, backend-offline tamper/restore, real refund links; Site published | Owner-private Site; temporary local tunnel |

## Public proof

`live-order.json`, `live-order-third-settled.json`, `live-order-second-settled.json` and `live-order-recovered.json` contain four actual settled orders: signed receipts, four to six genuine chain facts, ten accepted checks and redacted CRE transcripts. The latest order proves NOWNodes preprod payment reads with a network_magic=1 guard. `live-order-first-attempt.json` and `live-order-second-attempt.json` preserve failed attempts and are not successful settlement proof. `live-refund.json` includes actual creation/refund transactions, chain state, transaction fee and buyer balance proof.

`solana-deployment.json` and `solana-buffer-upload.json` prove loader-v3 deployment and exact binary comparison. `wallet-funding.json`, `setup-audit.json`, `nownodes-probe.json` and `cre-preflight.txt` record actual setup/connectivity separately. Earlier `rehearsal-*.json` files explicitly retain their simulated-payment labels.

Solana ELF: 93,728 bytes, SHA-256 `5c4acfafb2fc8a84d68966b1a31170074674b2fa0ec1aeeda71709c0c94bfa9f`, compiled from included Rust source through official Solana Playground build `aafab733-1cf4-45f9-833f-358e6c2db69f`. Artifact hashes are in `build-manifest.json`; actual CRE execution hashes appear in each transcript.

## Remaining submission gates

- Accessible MIT source repository; judge access to Site, Drive deck and video.
- Durable backend: quick tunnel depends on this machine and running processes.
- Partner check-ins: dashboard showed 1/2 while main showed 2/2. Organizer resolution is still needed; no message was sent on the team's behalf.
- Stage format/playback: PPTX embeds the movie; genuine legacy PPT drops it. Rules specify `.ppt` or `.keynote`; acceptance and playback need verification.
- Final track selection, dashboard checks and submission receipt. No hackathon submission has been sent.

The latest-five fact check can reject a busy address if new transactions arrive between purchase and verification. Demo addresses are quieter public addresses. Cardano supplier payments remain final; expiry returns only the Solana reward.

The third and fourth orders completed without operator recovery. Native browser access is available again at the latest audit. Repository publication and judge sharing remain pending; no authenticated GitHub write credentials are configured locally.
