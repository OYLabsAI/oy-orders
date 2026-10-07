# Cardano track: what we need and what we have

**A direct x402 implementation is an eligible route.** The official [Cardano Agentic Commerce track](https://builderbase.com/track/cardano-agentic-commerce) allows x402 on its own. Sokosumi listing approval and a Masumi payment node are not mandatory for that route. The Telegram discussion concerns teams listing coworkers through Sokosumi/Masumi; it is not a replacement for the published track criteria.

OY Orders already performs actual Cardano preprod purchases: HTTP 402 challenge, exact ADA quote, local signer with supplier/asset/network/amount/fee guards, durable signed-transaction recovery, and independent NOWNodes preprod payment observation after checking `network_magic=1`. Exact public receipts are under `docs/evidence/`.

The Cardano supplier payment is **final**. Solana independently protects the task reward. This is not a bridge, atomic cross-chain settlement, Cardano escrow, or Masumi refund protocol. See [Masumi x402 concepts](https://www.masumi.network/dev/masumi/core-concepts/x402).

The technical score can reward deeper Cardano-specific features. We do not implement native-token commerce, Masumi escrow/dispute logic or Cardano smart contracts. For the remaining time, prioritize the actual paid flow, source publication, a clear video and user validation. Adding a superficial registration or logo would not improve the substantive integration.

The new live challenge checks a signed Cardano fee claim against fresh NOWNodes records. A one-lovelace lie was rejected while the challenge signature and original 2 tADA purchase both passed. This is an audit of a controlled claim, with a separate demo signer and no new purchase; it never authorizes settlement.

If speaking to the Cardano mentor on site, show the real payment receipt and ask whether the x402-only route needs any additional event registration beyond track selection. A Sokosumi listing could improve distribution later, but should only be presented after a real compliant MIP-003 coworker is implemented and approved.

## Retail pass and saved submission draft

The agent now buys a supplier-signed digital pass, bound to the funded task input by SKU and a 256-bit token commitment. The actual retail order passed ten official CRE checks before Solana settlement. Its first cashier use was accepted and replay refused, including after persistent cloud stop/resume. This is a demo voucher using test coins; it cannot buy real coffee. One-use redemption is an atomic server ledger entry.

The new shopping mission compares four signed OY test offers against the customer goal and price budget, rejects bad deals and makes the valid x402 purchase. Its eleven official CRE checks include recomputing the committed selection. [Actual settled execution](evidence/shopping-order.json). This is deterministic policy selection, not an LLM or independent merchant marketplace. The updated shopping demo is 85.32 seconds.

The implementation uses TypeScript, Lucid Evolution and Cardano Foundation's x402 SDK 2.26, with actual NOWNodes Blockfrost-compatible preprod payment observation. Vercel hosts the UI and API proxy; a persistent cloud service runs the worker, SQLite and verifier. Customer wallet authorization, independent merchants and durable queues are the next production steps.

The Cardano draft has its live URL, problem/tools/deployment write-up and public hosted MP4 link saved and verified (3/5 required fields). The GitHub and Drive stage-deck fields still need their final links. The native Keynote deck is now ready with verified movie playback and public read-only access. The track dashboard's RSVP is closed and unchecked, with attendance confirmed (1/2 check-ins); this is an unconfirmed portal discrepancy, not a second-check-in requirement in the published Cardano qualification list. The official main page permits relevant partner submissions after applications close.
