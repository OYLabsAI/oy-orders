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
