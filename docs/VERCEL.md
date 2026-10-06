# Vercel deployment

Deployment is prepared locally, but **not published**. Vercel CLI 62.4.0 is logged out. The active ChatGPT identity has no linked Vercel user, and Vercel rejected temporary anonymous deployment with: “Temporary deployments aren't available for this attempt. Log in to continue.”

## Publish the prepared package

Authenticate to the intended Vercel account using `pnpm dlx vercel login`. If an account must be created, its owner must complete the signup and accept Vercel's terms. No paid plan, subscription, or database has been provisioned.

From the repository root:

```sh
# Saved proof and downloadable demo assets work without the live backend.
pnpm vercel:prepare
pnpm dlx vercel deploy .local/vercel-release --prod

# Or preserve fresh testnet orders using the existing external API:
pnpm vercel:prepare --api-origin=https://dialogue-fancy-rich-assistance.trycloudflare.com
pnpm dlx vercel deploy .local/vercel-release --prod
```

Select the intended team/project during initial linking. Deploy only `.local/vercel-release`, never the repository root or `.local`. The preparation script copies an explicit allowlist: the five frontend files, public evidence, demo video, embedded-video PPTX, legacy visual PPT, screenshot, and sanitized source ZIP. Wallets, `.env`, payment payloads, CRE login credentials and the SQLite database are excluded.

The generated package has no serverless functions and no dependency install/build on Vercel. Its optional rewrites forward `/health`, `/api/*`, and `/paid/*` to the supplied HTTPS API origin. This is **external backend hosting**, not migration of the worker to Vercel. The current Cloudflare tunnel depends on the operator's machine and can expire. When the API is unavailable, visitors can still open “Explore verified demo” and challenge saved signed evidence; fresh purchases are disabled.

Paths after a successful deployment:

- `/`: Orca Orders app and interactive saved proof.
- `/deliverables/`: video player and downloadable pitch/source assets.
- `/downloads/manifest.json`: asset sizes and SHA-256 hashes.
- `/hosting.json`: explicit backend mode and preparation time.

## Move the entire live backend to Vercel

Three concrete requirements remain:

1. Authenticated project access in the intended Vercel account.
2. A provisioned managed database for orders, events, unique payment claims and durable jobs, plus durable storage for each signed Cardano payload **before** broadcast. The current synchronous local SQLite/file implementation must be adapted and tested. `/tmp` must not be used for this state.
3. Durable order execution using Vercel Workflows or Queues, with Linux CRE/Bun execution packaged in a Function/container or an isolated Sandbox. Replace the serial timer worker. Load private testnet signer and supplier keys through private runtime configuration; never put them in the static upload or public source.

Preserve these guarantees during migration: unique payment transaction/order binding; one persisted signed payload reused after uncertain broadcast; per-order job concurrency control; exact chain/genesis guards; all ten receipt/payment/provenance checks before settlement; and replay-safe recovery after worker interruption. Move the four existing orders and events only after the managed storage and recovery tests pass. Keep the existing backend running until an end-to-end hosted testnet order settles and the expiry-refund path passes.

Vercel Functions scale down and do not preserve local files. Vercel's official monolith guide requires backing services for durable state and Queues/Workflows for worker processes. Sandboxes can execute native tools and retain snapshots between sessions, but Vercel explicitly says they are not designed for permanent server hosting. They are a worker execution option, not a substitute for the payment database.

Sources checked October 6, 2026:

- [Run a Docker monolith with workers on Vercel](https://vercel.com/kb/guide/docker-monolith-workers-vercel)
- [Vercel Workflows](https://vercel.com/docs/workflows)
- [Sandbox concepts](https://vercel.com/docs/sandbox/concepts)
- [Functions limits](https://vercel.com/docs/functions/limitations)

## Verification gate

Before calling deployment complete, verify the public homepage, signed saved-proof challenge/restore, the confirmed-refund card, mobile layout, all download hashes, MP4 byte-range playback, and that no private data was uploaded. If the live proxy is enabled, also verify uncached health/order/evidence responses and one fresh testnet execution. A build success or proxy configuration alone is not proof that the worker migrated.
