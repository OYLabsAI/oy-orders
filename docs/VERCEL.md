# Vercel deployment

**Public app and live backend:** https://oy-orders.vercel.app/ . [Video, pitch and source](https://oy-orders.vercel.app/deliverables/). Production is deployed in project `oy-orders` on Hobby.

## Implemented hosting

The static frontend and restricted Function proxy run on Vercel. The proxy accesses named persistent Sandbox `oy-orders-backend` using automatic project OIDC. It resumes stopped sessions and starts the API through an idempotent lock-protected script.

Node 24, SQLite WAL, the order worker and official CRE/Bun run in the Sandbox. Vercel Drive `oy-orders-data` mounts at `/data` for the database, persisted signed transactions, signer files and CRE authentication. Initial seed data is copied once; later deploys do not overwrite orders or refreshed credentials. Persistent snapshots retain source/runtime; Drive retains private state.

The proxy permits explicit order, challenge, health and paid-report routes; GET/POST/OPTIONS; bounded bodies; and the expected Sandbox HTTPS domain. Only needed content/payment headers pass. Exact CORS origins allow Vercel and the Sites fallback. Public evidence deliberately includes public addresses/hashes, never wallet secrets or API keys.

Hobby sessions last up to 45 minutes and resume on demand. Function duration is 300 seconds; paid reports get a bounded 185-second upstream wait for Cardano confirmation. Other requests stay short. An uncertain payment response resolves the already-saved transaction on chain rather than constructing a replacement.

## Verified

Fresh order `a1672a05-a755-4d35-8e44-475e8c0a2353` purchased, passed ten real CRE checks and settled without operator recovery. False and corrected claims ran through the public API. A deliberate idle-session stop resumed from a public request in about seven seconds, preserving the order and audit. See `docs/evidence/live-vercel-order.json` and `vercel-persistence.json`.

This removes the main demo's local tunnel dependency. Cold starts, providers and free quotas remain limits. This is a hackathon deployment, not permanent server hosting or a production SLA. Production should separate custody/operators, use a production database/queue and bind authorized CRE results on chain.

## Reproduce safely

```sh
# Requires Vercel login and private funded-testnet/CRE configuration.
pnpm exec tsx scripts/deploy-vercel-backend.ts
pnpm vercel:prepare --sandbox
pnpm dlx vercel deploy .local/vercel-release --prod
```

Deploy only `.local/vercel-release`, never the repository root. Its allowlist contains the app, public evidence, final downloads and proxy/runtime dependency manifest. Private keys, database, payment payloads and CRE credentials stay private. Official Linux CRE and compatible Ubuntu libc have pinned checksums; a private loader wrapper avoids changing the OS.

Local deployment tooling may load short-lived credentials from mode-0600 `.local/vercel-env`. Never commit or print them. CLI-created `.env.local` is excluded from uploads. Canonical frontend source is `apps/web`.

Paths: `/` app; `/deliverables/` downloads; `/downloads/manifest.json` sizes/SHA-256; `/hosting.json` backend mode; `/health` readiness. Build success alone is not end-to-end verification.

Official references checked during implementation: [Function duration](https://vercel.com/docs/functions/configuring-functions/duration), [Sandbox persistence](https://vercel.com/kb/guide/vercel-sandbox-duration-and-persistence), [Sandbox concepts](https://vercel.com/docs/sandbox/concepts), [SDK](https://vercel.com/docs/sandbox/sdk-reference).
