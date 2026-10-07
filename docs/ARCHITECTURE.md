# Architecture and trust boundaries

## Order flow

```mermaid
sequenceDiagram
  participant Buyer
  participant Solana as Solana Devnet escrow
  participant Agent as Durable agent worker
  participant Seller as Cardano x402 report seller
  participant Nodes as NOWNodes mainnet reads
  participant CRE as CRE CLI simulation
  Buyer->>Solana: Fund order with immutable terms
  Agent->>Solana: Reserve seller quote within ceiling
  Agent->>Nodes: Prepare latest confirmed wallet facts
  Agent->>Seller: GET report; handle 402 and preprod payment
  Seller-->>Agent: Report and signed receipt
  CRE->>Solana: Independently read order PDA and terms
  CRE->>Seller: Independently observe preprod payment
  CRE->>Nodes: Re-fetch report facts
  CRE-->>Agent: Accept or reject verification result
  Agent->>Solana: Trusted relayer settles accepted order
  Buyer->>Solana: Refund task reward after expiry
```

CRE does not use the seller's report as factual authority. It checks the registered signing key and independently fetches chain facts. NOWNodes remains a trusted data provider; consensus across node reads does not eliminate provider risk. The prototype uses CRE's real local simulation when configured, not a deployed DON. Its settlement authority is a trusted demo relayer. A compromised authority could bypass local verification; production must bind a DON-authorized result on chain before removing that trust.

The reporting service and agent currently run in the same process for a simple demo. The seller signing key is separately registered in the workflow configuration, but this is not independent organizational operation. The quote resource URL is constructed from configured API origin, never from user input.

## Immutable commitments

Canonical JSON sorts object keys and rejects undefined/non-finite values. SHA-256 commits the input, reserved quote, and report. The Ed25519 receipt binds order ID, quote digest, payment hash, recipient, asset, network, exact service amount, and result digest. CRE verifies those commitments with its configured seller key.

The program's order PDA derives from `order`, buyer public key, and SHA-256 of the order UUID. Its 328-byte account stores the nonce, buyer, worker, authority, input hash, seller hash, reserved quote, result and payment hashes, reward, expiry, ceiling and reserved amount. Instructions are create (0), reserve (1), settle (2) and refund (3).

The program checks ownership, PDA derivation, signer and writable permissions, current state, fixed destinations, unexpired settlement, and expired refunds. Settlement and refund are terminal and mutually exclusive. The buyer chooses the worker and authority at creation; CRE compares them against the configured demo identities. The backend verifies that funding evidence refers to the actual creation instruction for the order.

## Recovery and spending

SQLite uses WAL and a transactional claim for the single worker. Jobs are unique per order. Active jobs are recovered at startup; payment hashes cannot be reused across orders. A signed Cardano payload is saved privately before broadcast, and an uncertain retry reuses that same transaction. A receipt saved before restart is not purchased again. Errors fail closed into `blocked`; expiry still allows a buyer refund.

Each purchase validates seller, asset, network, order, expiry, quote reservation, amount ceiling and decoded transaction fee. The ceiling does not imply a treasury wallet: the agent uses an operator-funded test wallet. Supplier ADA spending and Solana task reward are denominated separately. There is no cross-chain atomicity. Chain confirmation is checked before live funding or refund is reflected in the interface.

## Deliberate limits

This is one report type, one seller, one worker and one queue. No production SLA, authentication for public read-only order records, multi-tenant wallet custody, identity verification, economic audit, or production security review is claimed. Public deployment should keep wallet inputs non-sensitive and use operator-owned funded test wallets only. The serial worker is intentionally sufficient for a hackathon and could be split without changing core verification.

Rehearsal modifies only its simulated clock in the expiry scenario. Rehearsal hashes and payment IDs are sample values and never receive explorer links. The locally signed receipt proves integrity of the fixture, not an actual purchase.

## Isolated live claim audit

The no-wallet challenge accepts only network and change presets. It anchors to a validated settled reference order, selects a currently readable finalized Solana transaction for that order’s wallet, and retains the original Cardano fact. These two transactions are pinned before signing with a separate challenge key and invoking a fresh official CRE simulation. The workflow independently reads the reference escrow, actual Cardano purchase and both pinned source transactions. It verifies the Solana wallet occurs in the fetched transaction, and the Cardano transaction matches the original reference. Source selection has a shared 15-second timeout; missing data fails closed. Six checks establish input, signature, freshness, reference escrow, payment and provenance. Strict output parsing binds the returned ID/hash and requires all six checks for acceptance.

This signer is separate from the supplier receipt key. Audits never enter an order or settlement queue and never move money. A persistent global daily limit and one-active-audit limit bound use. The common CRE runner serializes audit and settlement compilations to avoid concurrent temporary-directory races. On restart, interrupted audits return to the queue; stale claims fail freshness rather than gaining a new signature silently.

## Cloud state and resume

The public Vercel proxy accesses one named persistent Sandbox, with private SQLite/payment/key state on Vercel Drive. A lock-protected startup closes the inherited lock descriptor before launching the API. Session stop/resume preserved actual terminal order/audit state in a controlled test. Hobby limits and cold starts remain; this is not production durable-queue infrastructure or an availability guarantee.

A payment HTTP timeout/5xx can occur after broadcast. Recovery resolves the exact already-persisted signed transaction on chain before continuing; it never replaces that transaction. The cloud recovered example and clean later execution are documented separately.

## Retail digital-pass journey

The shop reuses the same quote, x402 purchase, signed receipt, CRE verifier and Solana settlement. Its funded input additionally commits the pass SKU and the SHA-256 digest of a private HMAC bearer token. The supplier-signed response commits that exact pass instead of unrelated wallet facts. CRE independently checks the real escrow and Cardano payment, then compares the signed pass commitment with funded terms. Only a settled, verified order can expose its QR token through an authorized checkout/pass request.

Checkout IDs and random private access keys provide idempotent recovery. SQLite stores credential digests only. A cashier verifies fresh settled escrow state and result binding before an atomic conditional redemption write. This write survives restart and lets only one scanner accept a pass. Redemption is deliberately a server ledger, not an on-chain token transfer. A single active checkout and five-per-rolling-day cap bound sponsored test spending. Signed Solana funding is saved before broadcast, like the durable Cardano purchase. See [RETAIL.md](RETAIL.md) for executed evidence and limits.


## Shopping policy

`/api/shop/plan` is a free deterministic comparison of four signed OY test offers. Checkout generates a fresh order-bound plan and commits its goal, budget and signed offer set into the escrow input. The worker rechecks that commitment and selects the cheapest eligible offer before x402 payment. CRE independently recomputes the decision as its eleventh check. Browser preview indices never authorize a payment. Goal/item, signature, registered seller, recipient, network, asset, expiry, fixed resource and price ceiling share a pure policy in `packages/core`. One active checkout and the five-per-day limit are rechecked in an atomic database transaction after asynchronous balance/rent preflight. See [SHOPPING.md](SHOPPING.md).

Hosting uses Vercel and its persistent Sandbox/Drive. The application does not directly integrate AWS services.
