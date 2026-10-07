# OY Orders: a shopping mission with spending limits

The customer sets one goal: buy an OY coffee demo pass. A supplier-price budget of 1 test ADA cannot buy the valid offer. At 2 or 3 test ADA the deterministic agent selects the valid 2 test ADA offer. The price budget excludes network fees, which retain their separate 1 test ADA ceiling. A separate 0.01 test SOL agent reward releases after verified delivery.

## The demonstration

The catalog contains four **OY-operated test offers**, deliberately chosen to exercise real checks. They are not independent merchants, discovered market prices or evidence of customer adoption. No LLM is called.

| Offer | Price | Actual decision |
|---|---:|---|
| Price changed after signing | 0.1 test ADA | Ed25519 signature fails |
| Signed offer for a music pass | 0.2 test ADA | Item does not match the coffee goal |
| Signed coffee offer above the supported budgets | 4 test ADA | Exceeds the authorized price ceiling |
| Signed matching coffee pass | 2 test ADA | Selected only if it fits the budget |

Comparison calls `/api/shop/plan` and spends no coins. Checkout never trusts a browser's selected index or old preview: it creates fresh order-bound signed offers on the server, selects the cheapest eligible one and binds a hash of the goal, budget and full signed offer set into the task input before funding.

The worker rechecks that commitment, the registered seller signature, exact order, item, recipient, asset, network, expiry, fixed resource URL and budget before reserving the quote and purchasing through x402. The same quote policy drives selection and payment guards. There is no arbitrary merchant URL or unrestricted shopper-provided purchase data.

The deployed Solana escrow binds the task input and ceiling. CRE's additional **Agent shopping policy** check recomputes the commitment, eligibility, selected quote and decision trace. Removing the plan or changing its budget, signatures or selection causes rejection. Earlier legacy executions retain their ten-check format; shopping executions require eleven complete checks.

## Actual execution

The new mission settled as order `e63c7700-2bc4-4fe6-adca-a3074149120c`. CRE passed **11/11** checks. Cardano purchase: `d396b14691f3319ce6d8b220eafe646433792972f47d3d64427085531956d9a2`. Solana settlement: `4mDHtiBzCamgQGPjRav81AKRk6fUwEdAw6PUoLo94WeUZc9nEnB8jk2hpgRLzEiBGKxwY4a32WUSHgBYJFbbsyNz`. The issued pass's first use was accepted. The full redacted plan, receipt and official verifier transcript are in [shopping-order.json](evidence/shopping-order.json).

## Funds and recovery

The buyer balance check covers the task reward, current rent for the 328-byte account and a fee reserve before allocating an order. Single-active-checkout and five-per-rolling-day checks run within the database transaction after asynchronous RPC reads, preventing concurrent requests from skipping the limits.

The public impossible-budget test returned `SHOP_NO_MATCH` and preserved the order count: [shopping-budget.json](evidence/shopping-budget.json). It creates no order, escrow or payment job.

One live attempt paused because the operator's demo buyer lacked test SOL for reward plus rent. Its signed funding transaction remained unconfirmed and expired, with no escrow or supplier purchase. The buyer was replenished from the operator's test worker wallet while preserving that worker's 0.05 test SOL reserve. A fresh mission uses a fresh order; the paused attempt is not counted as a paid purchase.

Cardano supplier payments are final. Only the separate Solana reward is refundable. This is not an atomic cross-chain purchase, guaranteed refund of all spending, proof of physical delivery, production DON deployment or general-purpose fraud detector. The common operator, configured seller and trusted settlement relayer remain prototype assumptions.

For deployment and the delivered pass, see [RETAIL.md](RETAIL.md). For technical eligibility and unresolved administrative gates, see [TRACK-READINESS.md](TRACK-READINESS.md).
