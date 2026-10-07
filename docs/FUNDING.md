# Test funds for OY Orders

Request test assets only at the hackathon sponsor booths. No mainnet funds are required.

## Solana — funding received

Requested **2 Devnet SOL** to the operator/deployment authority:

`BqoYzWMBGir2PwuNAXWdVwZAL6SMoinHeJH2KY8MoCXw`

Receipt verified on Devnet. At initial funding, the worker received 0.05 SOL and the buyer 0.1 SOL. Deployment is complete; the latest public setup audit records the remaining wallet balances. These are our generated test wallets, not a personal mainnet wallet.

[Confirmed operator-wallet funding transaction](https://explorer.solana.com/tx/5ym7miLqSDFexjF1RmsN9JZN6qPvhPVsXufGxn4FmjSKYhx3gdNGrAdtn5DsVUYoCp4g8jeYKUZJKJmfdcsrnPba?cluster=devnet)

## Cardano — funding received

**105 preprod test ADA was confirmed**, exceeding the requested 20. No additional funds are needed for the hackathon demo. Agent address:

`addr_test1qzsuqlzj7us8tx2ng5nsmfvwkv0fdq5gstqh8acj706k9fwm9twl5l6phwv92tt3tjzhmrpzyey55ke5qs2a89g4t3zqwmmujq`

The agent buys a 2 tADA reporting service per task, with a 1 tADA fee cap. The seller receives payment and needs no initial funds for this flow. Do not send preview or mainnet ADA. The remaining balance is recorded by `pnpm run doctor --json` in `evidence/setup-audit.json`.

Official faucet: https://docs.cardano.org/cardano-testnets/tools/faucet

## Other useful booth actions

- NOWNodes is activated for Solana and Cardano, and its existing API key is stored in private `.env`. The earlier activation screen advertised a switch to €20/month after the free month; the user completed activation.
- Native Keynote is installed and the final stage deck's embedded movie playback and public read-only Drive access are verified. The partner dashboard's 1/2 RSVP display is an unconfirmed discrepancy, not a published eligibility requirement; see `TRACK-READINESS.md`. No additional booth visit is needed unless final submission returns an actual registration error.

Funding was sufficient for seven recorded 2 tADA purchases, official CRE simulations, six settlements and a paid rejection with confirmed reward refund. No further mainnet funds are needed. Re-run the private doctor for current balances before more paid tests.
