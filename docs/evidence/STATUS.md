# Executed evidence — 7 October 2026

**Seven genuine paid testnet orders: six settled, one signed false report rejected and its task reward refunded.** The newest success executed through Vercel without operator recovery. The judge-controlled challenge performs fresh independent reads rather than replaying a local copy.

| Evidence | Executed result | Practical limit |
|---|---|---|
| Types and tests | Type check and 47 tests pass | VM, fixtures, parsing and recovery tests are distinct from chain execution |
| Solana program | Devnet `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj`; deployed bytes match tested ELF | Upgrade authority retained; trusted settlement relayer |
| Paid success | Six actual 2 tADA purchases and Solana settlements, ten CRE checks each | Separate test assets; no bridge or conversion |
| Paid adversarial order | Controlled seller's valid signature and digest pass; false source fact fails; reward never settled | Deliberate team-controlled supplier test |
| Same-order refund | Rejected order's 0.01 tSOL reward returned on chain after expiry | Cardano purchase remains final; refund pays its network fee |
| Fresh live challenge | Thousand-fold Solana lie and one-lovelace Cardano lie caught; honest corrected claim passes six checks | Fixed source transactions, separate signer; no money moves |
| NOWNodes | Actual facts from both chains; independent re-fetch; preprod payment network_magic=1 guard | Provider trusted; busy latest-five addresses may change between reads |
| Chainlink | Authenticated official CLI simulations on real records | Simulation, not production DON/TEE deployment |
| Cloud | Fresh paid order settled; persistent stop/resume kept order and audit unchanged | Hobby cold starts, 45-minute sessions/free quotas; no production SLA |
| Recovery | Saved signed payment reused after uncertain proxy response | Recovered run documented separately; latest fresh cloud run needed no recovery |

## Public evidence files

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

GitHub publication requires an authenticated account or owner-completed signup. A ZIP does not replace the required repository. Drive files preserve owner-only access. Verify judge access, the prior partner check-in 1/2 discrepancy, and acceptance/native playback of PPTX with its embedded movie. Legacy PPT loses the recording. No hackathon submission has been made.
