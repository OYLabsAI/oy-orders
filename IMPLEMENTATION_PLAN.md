# Orca Orders hackathon implementation plan

Implementation status, 6 October 2026: the MVP now has three actual settled testnet orders, genuine sponsor reads and CRE CLI simulations, a real expiry refund, interactive tamper replay, 36 passing tests, a 48-second proof video and an updated six-slide deck. Judge/source access, stable hosting and stage playback remain gates. Use `docs/SUBMISSION.md` for the current schedule and gates, `docs/LIVE_SETUP.md` for activation, and `docs/evidence/STATUS.md` for proven results. The deadline is not a claim that submission has been completed.

Build one working product for the main TOKEN2049 Origins track and the Cardano, Chainlink, Solana, and NOWNodes partner tracks. Orca Orders lets a user fund a blockchain reporting task, lets an agent buy the required service, and releases the task payment after verification. Prioritize a complete demonstrable flow, then failure handling, then presentation.

The submission deadline is 7 October 2026 at 23:59 Singapore time, equivalent to 17:59 Berlin time. Target submission by 22:00 Singapore time / 16:00 Berlin time. The same project may enter multiple partner tracks. All project development must occur during the official hacking period. [Event and submission rules](https://builderbase.com/event/token2049-origins-hackathon)

## Product and delivery defaults

- The customer is a blockchain operations team delegating a paid data task to an agent. The first task is a report on up to five confirmed transactions for one Solana wallet and one Cardano wallet, with source references and readable summaries.
- Use Solana Devnet for task escrow, Cardano preprod for service payments, and public mainnet data for the report. Label every network in the interface and receipts.
- Default task reward: 0.01 Devnet SOL. Default service price and ceiling: 2 preprod ADA. Reserve an additional 1 preprod ADA for transaction fees; show service price and fees separately. Default order deadline: 15 minutes. These are test assets, not a quoted exchange rate.
- The operator funds its own Cardano wallet. The buyer funds the Solana task reward. These are separate payments; the prototype does not convert or bridge assets. The operator bears supplier costs if verification fails and the task reward is refunded.
- Baseline settlement uses a real CRE simulation whose verified output is consumed by a restricted demo relayer. Document the relayer as a trusted settlement authority. Upgrade to native CRE delivery only if deploy access and an authenticated receiver can be demonstrated by hour 18.
- Direct Cardano x402 payments are final. Solana task refunds return the task escrow only. Cardano supplier escrow, Masumi identity/discovery, confidential workflows, additional sellers, recurring orders, mobile layouts, token issuance, and production funds are outside this version.
- Assume three technical contributors and one product/demo contributor. Assign people to the four workstreams by skill at kickoff; Loïc owns integration decisions and submission coordination. This assumption does not change the implementation interfaces.

## Architecture and interfaces

Use one pnpm project with a vanilla TypeScript frontend, an Express API and worker, shared portable verification plus Zod types, a native Rust Solana program, and a TypeScript CRE workflow. Persist orders and receipts in SQLite; chain escrow state remains authoritative in live mode. The frontend is published through Sites with owner-private access. The current API is a temporary local Cloudflare tunnel. Before judging, replace that tunnel with a stable Node host and persistent data volume, and verify judge access.

Dependencies are pinned in the lockfile. The implemented build uses Node 24, pnpm 11.19.0, Bun 1.4.2, CRE CLI 1.37.0 and the CRE SDK 1.6.0 template version. Solana Playground compiled the native program; LiteSVM executes that exact binary for escrow tests. Source compilation does not replace Devnet deployment evidence.

The Cardano adapter uses the official [x402 Express starter](https://developers.cardano.org/templates/x402-express/) pattern and pinned x402 Cardano SDK. It uses public Koios preprod by default, with optional Blockfrost preprod, for payment observation and Cardano Foundation's hosted preprod facilitator, with a configurable facilitator URL. Preserve the established protocol rather than replacing it.

### User journey

1. Connect a Solana wallet, select the two report addresses, review the task reward and supplier ceiling, then fund the order with one transaction.
2. The API observes the funded order and queues it. The agent requests the reporting resource and receives HTTP 402 payment requirements.
3. The agent reserves an allowed quote on Solana, then its controlled Cardano signer pays the exact permitted supplier. The signer checks the asset, network, recipient, price, fee ceiling, deadline, and unused order nonce before signing.
4. The paid service retrieves confirmed transactions through NOWNodes, produces deterministic JSON facts, and returns a payment receipt and report. A templated explanation is the baseline; an LLM summary is an optional presentation upgrade and never decides settlement.
5. CRE reads the funded order and the preprod payment, validates the seller receipt, and rechecks each cited mainnet transaction through NOWNodes. It verifies factual provenance and completeness, not subjective report quality.
6. The demo relayer submits settlement only after the expected CRE execution succeeds. The buyer receives the report and transaction links. If the order expires first, the buyer can reclaim its task escrow.

### Shared records

- `Order`: UUID, buyer public key, Solana order PDA, input hash, the two wallet addresses, reward in lamports, service ceiling in lovelace, seller address and receipt public key, deadline, and status.
- `Quote`: order ID, quote ID, resource URL, Cardano network, asset, amount as a decimal integer string, seller address, expiry, and SHA-256 hash of the canonical quote.
- `ServiceReceipt`: order ID, quote hash, Cardano payment transaction hash, recipient, asset, amount, canonical result hash, and seller Ed25519 signature. The signed receipt binds a chain payment to an order; this binding trusts the registered seller.
- `Report`: input hash, wallet addresses, network labels, confirmed source transaction IDs and normalized facts, generation timestamp, and canonical result hash. Hash canonical facts using stable key ordering and integer strings; exclude prose summaries.
- `Verification`: order ID, quote hash, payment hash, result hash, accepted/rejected result, reason code, workflow version, and execution mode. Store the simulation transcript and input digest with the record.
- `Event`: monotonically increasing sequence, order ID, timestamp, step, status, and public transaction link where available. Keep secrets and raw signing material out of events.

### Public API

| Interface | Required behavior |
| --- | --- |
| `POST /api/orders` | Validate addresses, create immutable order terms, return the unsigned Solana funding transaction and order ID. |
| `POST /api/orders/:id/start` | Accept the funding transaction signature; observe the correct funded PDA before queueing. Require a buyer wallet signature over the order ID. Repeated requests return the existing job. |
| `GET /api/orders/:id` | Return public status, terms, report when complete, evidence links, and execution mode. |
| `GET /api/orders/:id/events?after=sequence` | Return incremental public progress events. Poll every two seconds in the frontend. |
| `GET /api/orders/:id/refund-transaction` | Return an unsigned buyer refund transaction only when chain state permits it. |
| `GET /paid/report?orderId=...` | Use standard x402 middleware. Unpaid requests return 402; a settled permitted payment returns one report and signed receipt. |
| `GET /health` | Report API, worker, database, CRE authentication, and network availability without exposing credentials. |

Serialize all externally exchanged monetary values as integer strings. Use database uniqueness constraints for order execution, quote use, supplier payment hash, and settlement. A retry must resume the existing purchase and receipt rather than paying again.

### Solana program

- `create_order`: a buyer signature creates the order PDA and deposits the task reward. Bind the input hash, supplier identity, service ceiling, worker identity, and deadline.
- `reserve_quote`: the assigned worker signs; reject wrong supplier, asset, expired quote, amount over ceiling, wrong input hash, or a second reservation. Store the quote hash before the Cardano purchase.
- `settle_order`: require the configured demo authority, matching reserved quote and order, a result hash, payment hash, and an unexpired unsettled order. Pay the fixed assigned worker once and record completion.
- `refund_expired`: require the buyer, the on-chain deadline to have passed, and an unsettled order. Return the escrow once and record refund.
- Use Solana Clock for deadlines and enforce account ownership and PDA derivation. Settlement and refund must be mutually exclusive, including when submitted concurrently.
- Native CRE receiver mode uses the authenticated Keystone Forwarder authority and binds workflow identity where the supported interface permits it. Disable demo-authority settlement for any order configured for native mode.

Solana enforces task escrow and quote reservation; the controlled Cardano signer enforces the corresponding purchase. A server wallet owner could bypass that signer, so do not claim that the Solana program alone prevents arbitrary Cardano spending. [CRE Solana delivery and simulation behavior](https://docs.chain.link/cre/capabilities/solana-write)

### CRE and chain data

- Run a non-interactive cron-trigger simulation per queued order. Pass generated private per-order configuration; construct CLI arguments as an argument array, never a shell string derived from user input.
- CRE uses HTTP capabilities to read public order terms, Koios or Blockfrost preprod payment details, the signed seller receipt, and NOWNodes source transactions. Validate the order against actual Solana Devnet state rather than trusting the API status alone.
- Run irreversible payment and settlement operations outside the verification callback. DON nodes must not each purchase the same resource. CRE verifies immutable transaction IDs and canonical facts, with consistent network/confirmation rules.
- Check recipient, asset, amount, payment confirmation, seller signature, order binding, input hash, result hash, and all cited transaction facts. Return a specific rejection code for each failure.
- A successful local simulation is evidence accepted by the Chainlink track. The relayer accepts only records produced by the private worker after a successful expected execution, checks them against current escrow terms again, and rejects reuse. A simulation log is not proof of decentralized production execution. [Simulation documentation](https://docs.chain.link/cre/guides/operations/simulating-workflows)
- Use `sol.nownodes.io` and `ada-blockfrost.nownodes.io` for mainnet report data, subject to sponsor account access. Use Devnet RPC and Koios/Blockfrost preprod for test payment state. Do not infer testnet availability from a mainnet endpoint. [NOWNodes network list](https://nownodes.io/nodes)
- Retry read failures with backoff up to three times. Serialize Cardano purchases through one signer queue to avoid concurrent UTXO spending. After an uncertain broadcast, look up the transaction before retrying. If unavailable data prevents verification, leave escrow unsettled and allow deadline refund.

## Build sequence and ownership

Times below are elapsed from implementation kickoff. Retain the absolute submission target even if a milestone slips.

| Time | Solana contributor | Cardano contributor | CRE and data contributor | Product and demo contributor |
| --- | --- | --- | --- | --- |
| 0–2 hours | Toolchain, Devnet funds, program scaffold | Starter, preprod funds, real purchase | CRE account/CLI/authentication, NOWNodes key, real reads | Resolve partner check-ins with organizers; order interface and shared schema |
| 2–6 hours | Fund, reserve quote, settle, refund | Paid reporting route and signed receipt | Real verification simulation; worker/relayer skeleton | Wallet flow, progress screen, hosted frontend/backend |
| 6–12 hours | Connect program to worker | Connect agent to funded order | Complete verification-to-settlement flow | Full product journey and first recording |
| 12–18 hours | Failure and race tests | Retry safety and receipt tests | Forged receipt rejection; native delivery upgrade only if ready | Three user trials and mentor feedback |
| 18–24 hours | Fix reliability gaps | Fix purchase/recovery gaps | Evidence export, health checks | Polish onboarding; draft all submission text |
| 24–28 hours | Final deployed checks | Final payment checks | Final reproducibility checks | Final three-minute video, presentation file, README |
| 28–30 hours | Verify program/explorer links | Verify receipt links | Verify CRE evidence and data endpoints | Submit main and four partners; confirm accepted states |

By hour 6, capture a successful real transaction or invocation for each sponsor. By hour 12, capture one complete product journey. If the journey fails, freeze feature additions and put all available contributors on integration. By hour 18, freeze native CRE deployment work unless it already succeeds. By hour 24, freeze features and focus on reliability and submission materials.

The first two hours also establish a public Git repository, README with starter attribution, ignored secret files, hosted backend with persistent storage, and a stage deck shell. Keep a single integration branch and small subsystem commits. Human account creation, credentials, wallet funding, and any terms acceptance are setup actions; existing access is not assumed.

## Acceptance tests and deployment

- Complete a fresh order through real Solana funding, real Cardano payment, NOWNodes data retrieval, actual CRE simulation, and a real Solana settlement transaction. Repeat three times with distinct order IDs.
- Reject over-ceiling, wrong-asset, wrong-recipient, expired, and reused quotes before the Cardano signer pays.
- Reject an unconfirmed/wrong payment, invalid seller signature, modified result, missing cited transaction, and a payment reused for another order. No rejected receipt releases the task reward.
- Verify unauthorized settlement, duplicate settlement, early refund, wrong buyer, wrong PDA, and settle/refund races fail on-chain. Verify a valid expired-order refund returns funds once.
- Restart the worker after payment and before settlement; recover the same receipt without paying twice. Test timeout, NOWNodes 429, missing data, pending Cardano transaction, exhausted funds, and expired order.
- A judge can connect a Devnet wallet and run a new order with no command-line help. Also provide a rate-limited trial mode using a server-funded Devnet buyer, limited to three orders per session; label it as a hosted demo wallet.
- Persist recoverable queue state and expose exact progress and failure reasons. Add a health screen and record successful/failed workflow executions, payment IDs, latency, and costs. Never log wallet mnemonics, API keys, or authentication tokens.
- Rehearse against the deployed site from a clean browser session. Keep a genuine recorded demonstration available for network outages; do not present recorded or cached results as a newly executed purchase.

## Track evidence and final submission

| Entry | Required evidence and judging emphasis |
| --- | --- |
| Main | Working hosted product, repository, presentation file; emphasize the customer problem, complete flow, and actual user feedback. |
| Cardano | Open-source repository and documentation, real x402 purchase, payment explorer link, video at most three minutes, and write-up on problem, technical approach, and adoption. |
| Chainlink | CRE source, reproducible configuration and command, successful simulation transcript, rejection example, execution mode, and explicit relayer trust boundary. |
| Solana | Program ID, Devnet cluster, funding/settlement/refund explorer links, unaided runnable demo, and attribution of existing tooling. |
| NOWNodes | Which endpoints power the purchased report and verification, real request evidence with credentials removed, network labels, and the approach to additional networks and request limits. |

Provide a repository README with setup, configuration names, architecture, test instructions, deployment IDs, evidence index, starter attribution, and declared trust assumptions. Measure observed latency and test-asset costs from actual executions; do not invent performance claims. The product contributor collects three user interviews and one mentor review per sponsor, then incorporates concrete usability or eligibility gaps.

Use a six-slide presentation: customer problem, product journey, recorded demonstration, architecture and sponsor roles, measured results and failure handling, next users and business model. The business model is a task execution fee with a disclosed supplier charge; conversion economics are future work.

The three-minute video allocates 20 seconds to the problem, 25 seconds to funding, 40 seconds to the agent purchase, 30 seconds to verification and settlement, 30 seconds to rejection/refund, and 35 seconds to value and architecture. Identify any accelerated confirmation footage.

Deliver a Google Drive link to a `.ppt` or `.keynote` file as the event specifies. Use an actual supported export and test its embedded recording on another machine; do not simply rename a `.pptx` extension. Embed the screen recording directly. Finalist stage live technical demos are prohibited. Keep the separate Cardano video link and hosted judge demo available. [Deck and submission rules](https://builderbase.com/event/token2049-origins-hackathon)

Submit to the main track and each of the four partner tracks separately, fill each extra evidence field, and verify accepted submission state and judge access on every link. Resolve the observed partner check-in discrepancy with organizers before these submissions. Save submission confirmations and finalize by the internal 22:00 Singapore / 16:00 Berlin target on 7 October.
