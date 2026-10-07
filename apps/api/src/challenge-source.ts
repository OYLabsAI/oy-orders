import type { SourceFact } from "../../../packages/core/src/types.ts";
import { solanaTransactionFact } from "../../../packages/core/src/audit.ts";

type Rpc = (method: string, params: unknown[]) => Promise<any>;

// Ordinary RPC can prune older transactions. Pin a currently readable finalized
// transaction, then have CRE independently re-read this exact signature.
export async function recentAuditFact(
  wallet: string,
  rpc: Rpc,
): Promise<SourceFact> {
  const signatures = await rpc("getSignaturesForAddress", [
    wallet,
    { limit: 5, commitment: "finalized" },
  ]);
  if (!Array.isArray(signatures)) throw Error("LIVE_SOURCE_UNAVAILABLE");
  for (const candidate of signatures.filter((t) => !t.err)) {
    const tx = await rpc("getTransaction", [
      candidate.signature,
      { commitment: "finalized", maxSupportedTransactionVersion: 0 },
    ]);
    const fact = solanaTransactionFact(wallet, candidate.signature, tx);
    if (fact) return fact;
  }
  throw Error("LIVE_SOURCE_UNAVAILABLE");
}
