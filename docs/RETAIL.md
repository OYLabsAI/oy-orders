# OY Shop: a verified digital pass

The pass is now the delivered result of a shopping mission. Set a budget, compare signed offers, refuse bad deals and buy the valid matching pass. [SHOPPING.md](SHOPPING.md) explains the eleven-check policy and actual settled purchase. The QR and one-use cashier record remain secondary features. **It is a demo voucher, not a claim to real coffee or admission.**

## What actually ran

Order `29ab7330-93fa-4aef-b74e-02bca9495b3a` settled through the live cloud service. An operator-funded buyer locked **0.01 tSOL** in the custom Solana Devnet program. The deterministic agent paid a separately funded **2 tADA** to the supplier through exact Cardano x402. An official Chainlink CRE simulation passed **10/10** checks before the trusted prototype relayer settled. A QR was issued only after settlement. The first cashier redemption succeeded and a second request returned `ALREADY_USED`.

[Complete redacted execution](evidence/retail-pass.json) includes the actual order, events, CRE transcript and duplicate-redemption response. [Public transaction evidence](https://oy-orders.vercel.app/api/orders/29ab7330-93fa-4aef-b74e-02bca9495b3a/evidence) is available independently of the video.

## Necessary sponsor roles

| Technology | Actual role |
|---|---|
| Solana | The custom Devnet PDA binds the requested pass commitment, fixed worker, seller, budget and expiry. It protects the task payment and prevents settlement/refund from both succeeding. |
| Cardano | Exact preprod x402 lets the agent purchase the supplier-signed pass resource. The operator worker's supplier funds are separate from the buyer's tSOL. |
| Chainlink CRE | Reads the actual escrow and independently checks the preprod purchase, seller signature, result digest and pass commitment. The official CLI simulation gates settlement through a trusted relayer. |
| NOWNodes | Its preprod API identifies the network and independently confirms the supplier transaction, outputs, recipient, amount and fee. The separate reporting/fake-answer journey uses actual records from both mainnets. |

Logos sit beside these actions and their evidence. Brand assets identify technologies used, without implying a partnership, award or endorsement.

## Pass security and recovery

The server derives an unpredictable bearer token from a private persistent HMAC key. The token's SHA-256 commitment is included in the funded input and supplier-signed result. SQLite stores only the token/access digests. A separate random checkout key authorizes polling and recovering that checkout after refresh. The QR's bearer token stays in the URL fragment, out of normal server query logs.

A cashier request first checks settled receipt binding and fresh Solana escrow state, then uses an atomic conditional write. Two scanners cannot both accept an unused pass. Usage persists across process restart. Anyone holding the QR can use the pass once; the token is intentionally a bearer ticket.

The live shop accepts one fixed SKU and server-generated order IDs. Persistent idempotency protects retries. One active checkout and a global five-per-rolling-day limit bound public-demo test spending to 0.05 tSOL plus rent/fees and 10 tADA. Funding stores the signed Solana transaction before broadcast and retries that same payload. It never creates a replacement payment silently.

## Scope and deployment

This is one seller, one product and a deterministic purchasing agent. It does not mint an NFT, prove physical coffee delivery, bridge currencies, provide general truth verification, or put redemption on chain. Supplier payment is final. Expiry refunds only the separate Solana task payment. CRE is official simulation plus a trusted relayer, not a deployed production DON or TEE.

For production, use a real merchant catalog and customer wallet authorization, bind DON-authorized verification on chain, separate the merchant/operator, replace the serial demo worker with a durable service, and add customer support/refund rules. Scale the one-use database with transactional persistence before accepting real goods or payments. Business demand and pricing remain hypotheses, not claimed traction.
