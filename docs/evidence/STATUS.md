# Executed evidence — 6 October 2026

**The demonstrable product is currently a rehearsal. It is not yet eligible as a proven live integration for all partner prizes.**

| Evidence | Executed result | Practical limit |
|---|---|---|
| TypeScript validation | Root type check passes | Static checking only |
| Automated tests | 29 passed, 0 failed | Local VM and fixtures, not sponsor network execution |
| Browser success | Fund → reserve → purchase → signed receipt → verification → settled | Rehearsal, no assets moved |
| Browser/CLI failure paths | Changed report rejected; expiry reward refunded | Rehearsal |
| Solana program | Real compiled ELF tested in LiteSVM | Not deployed on Devnet; airdrop attempt failed |
| CRE workflow | Compiles to WebAssembly; independent verifier fixture tests pass | Real CLI simulation blocked on login |
| NOWNodes account | €15 credit balance visibly redeemed | Plan activation/API key pending; renewal not accepted |
| Cardano payment | x402 adapter and spend controls implemented | Preprod wallet funding, Blockfrost key and true transaction pending |
| Frontend | Local responsive UI and WebMCP tools verified | Hosted Site owner-private; API uses a temporary tunnel |

## Public artifacts

`rehearsal-success.json`, `rehearsal-tampered.json`, `rehearsal-expiry.json` explicitly disclose simulated payments and sample chain facts. They include actual local Ed25519 signatures. Screenshots and the demo movie retain the rehearsal notice. There are no successful network transaction hashes or CRE simulation transcripts to submit yet.

The compiled program is `orca_orders.so`, 93,728 bytes, SHA-256 `5c4acfafb2fc8a84d68966b1a31170074674b2fa0ec1aeeda71709c0c94bfa9f`. It was compiled from the included native Rust source by the official public Solana Playground compiler service, build UUID `aafab733-1cf4-45f9-833f-358e6c2db69f`.

CRE's compiled file and final validation hashes are recorded in `build-manifest.json`. Compiler success does not satisfy the successful CLI simulation requirement. Test fixtures do not use a DON.

## Evidence still required for submission

- Solana Devnet program ID and genuine creation/reservation/settlement/refund transaction hashes.
- A successful actual Cardano preprod x402 payment, recipient output, fee and signed receipt.
- Genuine NOWNodes Solana and Cardano requests used by a report and independently re-fetched by the verifier.
- A successful official CRE CLI simulation and redacted transcript.
- Accessible source repository, stable judge-accessible demo, Drive stage-deck link, and <=3-minute Cardano demo recording.
- Verify partner check-ins: dashboard showed 1/2 while main showed 2/2. This was not silently resolved.
- Stage-format compatibility: the PPTX embeds the actual rehearsal recording; the genuine legacy PPT export drops it. Verify the exact accepted format and stage player before uploading the final deck. New Drive files are owner-only.

Do not replace missing evidence with sample IDs, claim a generated program key is deployed, or remove this disclosure before the missing executions succeed.
