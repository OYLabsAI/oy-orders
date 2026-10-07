# Executed evidence — 7 October 2026

**Twelve genuine paid testnet orders: ten settled, one signed false report rejected with its task reward refunded, and one payment-response-error order expired without delivery with its separate task reward refunded.** Both refunded orders’ Cardano supplier purchases remain final. [Recorded payment tally](paid-order-tally.json). The newest shopping mission passed eleven official CRE checks and delivered a usable pass. The earlier retail pass passed ten checks, accepted one use and refused replay. The judge-controlled challenge performs fresh independent reads rather than replaying a local copy.

| Evidence | Executed result | Practical limit |
|---|---|---|
| Types and tests | Type check and 69 tests pass | VM, fixtures, parsing, pass ledger and recovery tests are distinct from chain execution |
| Solana program | Devnet `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj`; deployed bytes match tested ELF | Upgrade authority retained; trusted settlement relayer |
| Paid success | Ten actual 2 tADA purchases and Solana settlements. Latest shopping has eleven checks; earlier orders have ten | Separate test assets; no bridge or conversion |
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

## Earlier cloud proof links

[Program on Devnet](https://explorer.solana.com/address/2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj?cluster=devnet).

[Latest cloud funding](https://explorer.solana.com/tx/4Dw46ytHgHeCXTb6XtJRYHqg5bqz5WUjjZAq2TZrdEi9Hkg4NadVgvhbeKhD5DRo9tbcTkx5neyXB7RWFAX9qCLh?cluster=devnet).

[Latest cloud settlement](https://explorer.solana.com/tx/2qjS36DjpGmDZ79PvrR6Tx6f7ih373g6KKa3WTm1g7tqKJjJYHCfbKFRQqhPpouU6iKAvmrv1JqYqtRffd3ji8bL?cluster=devnet).

[Paid rejected-order refund](https://explorer.solana.com/tx/w9qZmkBDYr6hRxJN1WhUoJH2h7N6Qc4iZxrP8uXJNQK9DgcM1uJFwcrRjKHqX9k6YeUmcZqzcLjmN5hCuTPKCaP?cluster=devnet).

Full Cardano hashes and preprod explorer links are in each evidence file.

## Submission gates

The public source and hackathon build history are published at https://github.com/OYLabsAI/oy-orders . The requested organization transfer is verified. A ZIP does not replace the required repository. Drive native Keynote, PPTX, MP4 and ZIP judge access is verified. Native Keynote playback of the byte-identical embedded movie is verified, and all six slides were visually checked. The replacement 89.02-second movie records actual public-app interaction, with edited waits and synthetic narration. The successful recorded order required operator-assisted same-payment recovery, which is disclosed. Older expired checkouts are excluded from its footage. Legacy PPT loses the recording. BuilderBase support confirmed on 7 October in the [Telegram support topic](https://web.telegram.org/a/#-1003985854926_137) that attendance-confirmed/RSVP-closed 1/2 does not affect submission; the official main page also permits relevant partner submissions after applications close. All required draft fields are saved and verified: main 3/3, Solana 3/3, Cardano 5/5, CRE 4/4 and NOWNodes 4/4. Every dashboard shows **You're ready to submit**. No final hackathon submission has been made.

## Retail pass, 7 October

[retail-pass.json](retail-pass.json): order `29ab7330-93fa-4aef-b74e-02bca9495b3a` bought and settled a supplier-signed coffee-style demo pass through the real cloud service. Solana funding `4pUSKJ31uhbbrvewZ1DAanm8mQiVC5eE6SUiEmttALSaYygUoNCzMRPqcdx7ozmageGSiyzL4V4rCimyh3csZBmi`; Cardano supplier payment `d5f8f92b233a63831ad64adfa72d5b681dd65ebabeff12ab7f763f5216139800`; settlement `2Xp7pF7NEptyCrEW12txmC1u9Rx8gBB6mpSyNSAF4vzELnsmuvZfbxE6DuXLRDKc8rcF6X4VyV73Nde4xsA9D66o`. All ten official CRE checks passed. First redemption was accepted; replay returned `ALREADY_USED`. Redemption is an atomic persistent server write, not an on-chain NFT/physical-delivery proof.

[retail-persistence.json](retail-persistence.json): controlled idle cloud stop and public-request resume took 8.525 seconds. The settled order, used timestamp and private-key-derived pass commitment were preserved. No new payment was made by this recovery test. Free-quota and cold-start limits remain.


## Shopping mission, 7 October

[shopping-order.json](shopping-order.json): order `e63c7700-2bc4-4fe6-adca-a3074149120c` committed its goal, 2 test ADA budget and all four signed OY test offers before funding. The agent refused the altered price, wrong item and over-budget offer, bought the valid matching pass, and passed **11/11 official CRE checks** before settlement. Its first cashier use was accepted. [Public execution](https://oy-orders.vercel.app/api/orders/e63c7700-2bc4-4fe6-adca-a3074149120c/evidence). Cardano payment [`d396b14691f3319ce6d8b220eafe646433792972f47d3d64427085531956d9a2`](https://preprod.cardanoscan.io/transaction/d396b14691f3319ce6d8b220eafe646433792972f47d3d64427085531956d9a2). [Solana settlement](https://explorer.solana.com/tx/4mDHtiBzCamgQGPjRav81AKRk6fUwEdAw6PUoLo94WeUZc9nEnB8jk2hpgRLzEiBGKxwY4a32WUSHgBYJFbbsyNz?cluster=devnet).

[shopping-budget.json](shopping-budget.json): 1 test ADA checkout returned `SHOP_NO_MATCH` with 16 orders before and after. No order or funding job was created. Free UI comparison independently showed every offer refused. The server always creates fresh authoritative offers for a paid checkout.

A separate attempt `0feab18e-5574-4d73-b53f-c0223eeaaddc` paused for insufficient operator demo-buyer test SOL. Its saved funding transaction expired unconfirmed, with no escrow or supplier purchase. It is excluded from the paid-order count. Operator-owned test funds replenished the buyer while preserving the worker reserve before the successful fresh mission. Balance and rent preflight now precede checkout allocation.

## Recorded checkout and payment-response repair, 7 October

[recorded-shopping-order.json](recorded-shopping-order.json): order `4b722b39-0a23-41de-a60b-ab977f16cd98` actually paid 2 tADA on Cardano preprod, passed 11/11 official CRE checks and settled on Solana Devnet. The issued pass accepted its first use and refused replay. The x402 purchase response returned HTTP 402 after broadcast; NOWNodes independently confirmed the exact saved transaction. The reward stayed locked. An operator resumed that same order after checking its escrow, recipient, amount, fee and deadline. No second purchase was made. The payment code now resolves a post-broadcast HTTP 402 through the saved transaction’s independent chain evidence, as it already does for network timeouts; an HTTP error itself proves no payment or delivery.

[recorded-shopping-video.json](recorded-shopping-video.json): 89.02 seconds, 1920×1080 H.264/AAC, actual timestamped browser captures at approximately 8 FPS encoded at 30 FPS, synthetic narration and captions. Pauses and confirmation waits are edited. Only the successful recorded checkout and pass are shown; the older expired checkout is excluded. The previous edited screenshot tour is retained privately as a backup.

[expired-payment-error.json](expired-payment-error.json): earlier order `e0e6e66e-fb94-4327-a601-9fe04be7b583` had the same post-payment HTTP 402 error. Its confirmed Cardano purchase is recorded, but its deadline had expired without delivery. Its 0.01 tSOL task reward was returned to the buyer on chain, escrow state 3, with a 5000-lamport refund fee. The Cardano purchase remains final. This is distinct from the signed false-report rejection/refund test; neither is a successful delivery.

[additional-shopping-order.json](additional-shopping-order.json) preserves another actual settled shopping execution. The full tally is 12 paid orders, 10 settled successes and the two distinct task reward refunds. One separate unfunded attempt created no escrow or Cardano payment and is excluded.
