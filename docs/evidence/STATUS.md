# Executed evidence — 7 October 2026

**Eight genuine paid testnet orders: seven settled, one signed false report rejected and its task reward refunded.** The newest retail pass passed ten official CRE checks, accepted one use and refused replay. The judge-controlled challenge performs fresh independent reads rather than replaying a local copy.

| Evidence | Executed result | Practical limit |
|---|---|---|
| Types and tests | Type check and 57 tests pass | VM, fixtures, parsing, pass ledger and recovery tests are distinct from chain execution |
| Solana program | Devnet `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj`; deployed bytes match tested ELF | Upgrade authority retained; trusted settlement relayer |
| Paid success | Six actual 2 tADA purchases and Solana settlements, ten CRE checks each | Separate test assets; no bridge or conversion |
| Paid adversarial order | Controlled seller's valid signature and digest pass; false source fact fails; reward never settled | Deliberate team-controlled supplier test |
| Same-order refund | Rejected order's 0.01 tSOL reward returned on chain after expiry | Cardano purchase remains final; refund pays its network fee |
| Fresh live challenge | Thousand-fold Solana lie and one-lovelace Cardano lie caught; honest corrected claim passes six checks | Source transactions pinned per challenge, separate signer; no money moves |
| NOWNodes | Actual facts from both chains; independent re-fetch; preprod payment network_magic=1 guard | Provider trusted; busy latest-five addresses may change between reads |
| Chainlink | Authenticated official CLI simulations on real records | Simulation, not production DON/TEE deployment |
| Cloud | Fresh paid order settled; persistent stop/resume kept order and audit unchanged | Hobby cold starts, 45-minute sessions/free quotas; no production SLA |
| Recovery | Saved signed payment reused after uncertain proxy response | Recovered run documented separately; latest fresh cloud run needed no recovery |

## Live-check repair

On 7 October, NOWNodes returned null for the older Solana transaction pinned by earlier challenges. The repaired audit selects a currently readable finalized transaction for the same reference wallet, pins it before signing, and has CRE independently re-read it. Missing source data remains a failure. Both network logos rotate on selection and during checking, with reduced-motion support. Fresh Solana and Cardano false claims failed provenance; an honest claim passed all six checks after a controlled cloud stop/resume. Historical proofs below remain unchanged.

## Public evidence files

- `live-audit-repair.json`, `live-audit-repair-resume.json`, `live-challenge-repaired-solana.json`, `live-challenge-repaired-cardano.json`, `live-challenge-repaired-honest.json`: observed failure cause, repair verification, and fresh official CRE transcripts.
- `live-vercel-order.json`: clean cloud order `a1672a05-a755-4d35-8e44-475e8c0a2353`, actual payment, ten checks and settlement.
- `live-vercel-recovered.json`: cloud order `bda7a31e-1917-4a55-ba95-c1890051a337`; HTTP 503 recovery reused the original Cardano transaction. This is not presented as an unaided run.
- `live-adversarial.json`: paid order `caa423cd-c20f-448f-9186-e98034fa1df1`, accepted signature/digest, rejected provenance, protected escrow and same-order confirmed refund.
- `live-challenge-solana.json`, `live-challenge-cardano.json`, `live-challenge-honest.json`: signed claims and official CRE transcripts. Solana 30,000,001 versus 30,000; Cardano 248,762 versus 248,761; corrected honest claim accepted.
- `vercel-persistence.json`: controlled idle-session stop/public-request resume with unchanged settled order and challenge.
- `live-order.json`, `live-order-third-settled.json`, `live-order-second-settled.json`, `live-order-recovered.json`: four earlier settled paid orders. First/second-attempt files preserve failures and are not settlement proof.
- `live-refund.json`: earlier separate 90-second direct-program expiry probe, without a Cardano purchase. Product UI keeps 15 minutes; the paid adversarial probe used eight minutes.
- `solana-deployment.json`, `solana-buffer-upload.json`: deployment and exact byte comparison. ELF: 93,728 bytes; SHA-256 `5c4acfafb2fc8a84d68966b1a31170074674b2fa0ec1aeeda71709c0c94bfa9f`.
- Funding/setup/node probes and preflight document connectivity separately. `rehearsal-*.json` retain simulated-payment labels. All public transcripts redact credentials.

## Exact latest proof links

[Program on Devnet](https://explorer.solana.com/address/2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj?cluster=devnet).

[Latest cloud funding](https://explorer.solana.com/tx/4Dw46ytHgHeCXTb6XtJRYHqg5bqz5WUjjZAq2TZrdEi9Hkg4NadVgvhbeKhD5DRo9tbcTkx5neyXB7RWFAX9qCLh?cluster=devnet).

[Latest cloud settlement](https://explorer.solana.com/tx/2qjS36DjpGmDZ79PvrR6Tx6f7ih373g6KKa3WTm1g7tqKJjJYHCfbKFRQqhPpouU6iKAvmrv1JqYqtRffd3ji8bL?cluster=devnet).

[Paid rejected-order refund](https://explorer.solana.com/tx/w9qZmkBDYr6hRxJN1WhUoJH2h7N6Qc4iZxrP8uXJNQK9DgcM1uJFwcrRjKHqX9k6YeUmcZqzcLjmN5hCuTPKCaP?cluster=devnet).

Full Cardano hashes and preprod explorer links are in each evidence file.

## Submission gates

GitHub publication requires an authenticated account or owner-completed signup. A ZIP does not replace the required repository. Verify final Drive judge access, the confirmed partner check-in 1/2 discrepancy, and acceptance/native playback of PPTX with its embedded movie. Legacy PPT loses the recording. No hackathon submission has been made.

## Retail pass, 7 October

[retail-pass.json](retail-pass.json): order `29ab7330-93fa-4aef-b74e-02bca9495b3a` bought and settled a supplier-signed coffee-style demo pass through the real cloud service. Solana funding `4pUSKJ31uhbbrvewZ1DAanm8mQiVC5eE6SUiEmttALSaYygUoNCzMRPqcdx7ozmageGSiyzL4V4rCimyh3csZBmi`; Cardano supplier payment `d5f8f92b233a63831ad64adfa72d5b681dd65ebabeff12ab7f763f5216139800`; settlement `2Xp7pF7NEptyCrEW12txmC1u9Rx8gBB6mpSyNSAF4vzELnsmuvZfbxE6DuXLRDKc8rcF6X4VyV73Nde4xsA9D66o`. All ten official CRE checks passed. First redemption was accepted; replay returned `ALREADY_USED`. Redemption is an atomic persistent server write, not an on-chain NFT/physical-delivery proof.

[retail-persistence.json](retail-persistence.json): controlled idle cloud stop and public-request resume took 8.525 seconds. The settled order, used timestamp and private-key-derived pass commitment were preserved. No new payment was made by this recovery test. Free-quota and cold-start limits remain.
