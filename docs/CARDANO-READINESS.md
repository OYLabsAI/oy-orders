# Cardano track: what we need and what we have

**A direct x402 implementation is an eligible route.** The official [Cardano Agentic Commerce track](https://builderbase.com/track/cardano-agentic-commerce) allows x402 on its own. Sokosumi listing approval and a Masumi payment node are not mandatory for that route. The Telegram discussion concerns teams listing coworkers through Sokosumi/Masumi; it is not a replacement for the published track criteria.

OY Orders already performs actual Cardano preprod purchases: HTTP 402 challenge, exact ADA quote, local signer with supplier/asset/network/amount/fee guards, durable signed-transaction recovery, and independent NOWNodes preprod payment observation after checking `network_magic=1`. Exact public receipts are under `docs/evidence/`.

The Cardano supplier payment is **final**. Solana independently protects the task reward. This is not a bridge, atomic cross-chain settlement, Cardano escrow, or Masumi refund protocol. See [Masumi x402 concepts](https://www.masumi.network/dev/masumi/core-concepts/x402).

The technical score can reward deeper Cardano-specific features. We do not implement native-token commerce, Masumi escrow/dispute logic or Cardano smart contracts. With ten hours remaining, prioritize the actual paid flow, source publication, a clear video and user validation. Adding a superficial registration or logo would not improve the substantive integration.

The new live challenge checks a signed Cardano fee claim against fresh NOWNodes records. A one-lovelace lie was rejected while the challenge signature and original 2 tADA purchase both passed. This is an audit of a controlled claim, with a separate demo signer and no new purchase; it never authorizes settlement.

If speaking to the Cardano mentor on site, show the real payment receipt and ask whether the x402-only route needs any additional event registration beyond track selection. A Sokosumi listing could improve distribution later, but should only be presented after a real compliant MIP-003 coworker is implemented and approved.
