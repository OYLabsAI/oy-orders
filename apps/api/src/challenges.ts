import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign,
} from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { canonical, hash } from "../../../packages/core/src/canonical.ts";
import type {
  AuditClaim,
  AuditResult,
} from "../../../packages/core/src/audit.ts";
import { config } from "./config.ts";
import { executeCre } from "./cre-runner.ts";
import { readCreResult } from "./cre-output.ts";
import type { Store } from "./store.ts";
import { solanaRpc } from "./data.ts";
import { recentAuditFact } from "./challenge-source.ts";

export const challengeInput = z
  .object({
    network: z.enum(["solana", "cardano"]),
    change: z.enum(["honest", "tiny", "huge"]),
  })
  .strict();
type Challenge = {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  claim: AuditClaim;
  signature: string;
  claimHash: string;
  result?: AuditResult;
  transcript?: string;
  error?: string;
};
const resultSchema = z
  .object({
    id: z.string().uuid(),
    mode: z.literal("cre-simulation"),
    accepted: z.boolean(),
    timestamp: z.number().finite(),
    claimHash: z.string().regex(/^[a-f0-9]{64}$/),
    checks: z
      .array(
        z.object({ name: z.string(), passed: z.boolean(), detail: z.string() }),
      )
      .length(6),
    differences: z.array(
      z.object({
        network: z.string(),
        tx: z.string(),
        claimed: z.string(),
        actual: z.string(),
        field: z.string(),
      }),
    ),
  })
  .strict();
export function parseAuditOutput(
  output: string,
  claim: AuditClaim,
): AuditResult {
  const result = resultSchema.parse(readCreResult(output));
  if (
    result.id !== claim.id ||
    result.claimHash !== hash(claim) ||
    result.timestamp < claim.issuedAt ||
    result.accepted !== result.checks.every((c) => c.passed) ||
    (result.accepted && result.differences.length)
  )
    throw new Error("AUDIT_RESULT_MISMATCH");
  return result;
}
export class Challenges {
  private key;
  readonly publicKey: string;
  private busy = false;
  private creating = false;
  constructor(
    private store: Store,
    private execute = executeCre,
  ) {
    const path = resolve(config.dataDir, "challenge-signing.pem");
    if (!existsSync(path))
      writeFileSync(
        path,
        generateKeyPairSync("ed25519").privateKey.export({
          type: "pkcs8",
          format: "pem",
        }),
        { mode: 0o600 },
      );
    this.key = createPrivateKey(readFileSync(path));
    this.publicKey = createPublicKey(this.key)
      .export({ type: "spki", format: "pem" })
      .toString();
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, status TEXT NOT NULL, body TEXT NOT NULL)",
    );
  }
  get(id: string): Challenge {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("INVALID_CHALLENGE_ID");
    const row = this.store.db
      .prepare("SELECT body FROM challenges WHERE id=?")
      .get(id) as { body: string } | undefined;
    if (!row) throw new Error("ORDER_NOT_FOUND");
    return JSON.parse(row.body);
  }
  private save(challenge: Challenge) {
    this.store.db
      .prepare(
        "INSERT INTO challenges VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,body=excluded.body",
      )
      .run(
        challenge.id,
        challenge.claim.issuedAt,
        challenge.status,
        JSON.stringify(challenge),
      );
    return challenge;
  }
  async create(raw: unknown) {
    const input = challengeInput.parse(raw);
    if (config.mode !== "live") throw new Error("LIVE_AUDIT_REQUIRED");
    if (this.creating) throw new Error("CHALLENGE_BUSY");
    // Global limits survive restarts; arbitrary URLs, transactions and signatures
    // are never accepted. Audits cannot enter the order or settlement queue.
    const active = this.store.db
      .prepare(
        "SELECT id FROM challenges WHERE status IN ('queued','running') LIMIT 1",
      )
      .get();
    if (active) throw new Error("CHALLENGE_BUSY");
    const count = this.store.db
      .prepare("SELECT count(*) AS n FROM challenges WHERE created_at>?")
      .get(Date.now() - 86400000)!.n as number;
    if (count >= 90) throw new Error("CHALLENGE_DAILY_LIMIT");
    const order = this.store.get(
      process.env.AUDIT_REFERENCE_ORDER ??
        "8456603d-6318-4a72-a403-af2c992cc84a",
    );
    if (
      order.mode !== "live" ||
      order.status !== "settled" ||
      !order.report ||
      !order.payment
    )
      throw new Error("AUDIT_REFERENCE_REQUIRED");
    this.creating = true;
    try {
      const signal = AbortSignal.timeout(15000);
      const solanaFact = await recentAuditFact(
        order.input.solanaWallet,
        (method, params) => solanaRpc(method, params, true, signal),
      );
      const facts = (["solana:mainnet", "cardano:mainnet"] as const).map(
        (network) => {
          if (network === "solana:mainnet") return solanaFact;
          const fact = order.report!.facts.find((f) => f.network === network);
          if (!fact) throw new Error("AUDIT_BOTH_NETWORKS_REQUIRED");
          return { ...fact };
        },
      );
      const target = facts.find(
        (f) => f.network === `${input.network}:mainnet`,
      )!;
      target.fee =
        input.change === "tiny"
          ? (BigInt(target.fee) + 1n).toString()
          : input.change === "huge"
            ? (BigInt(target.fee) * 1000n + 1n).toString()
            : target.fee;
      const claim: AuditClaim = {
        id: randomUUID(),
        referenceOrderId: order.id,
        issuedAt: Date.now(),
        facts,
      };
      return this.save({
        id: claim.id,
        status: "queued",
        claim,
        claimHash: hash(claim),
        signature: sign(null, Buffer.from(canonical(claim)), this.key).toString(
          "base64",
        ),
      });
    } finally {
      this.creating = false;
    }
  }
  start() {
    this.store.db.exec(
      "UPDATE challenges SET status='queued',body=json_set(body,'$.status','queued') WHERE status='running'",
    );
    const tick = async () => {
      if (this.busy) return;
      const row = this.store.db
        .prepare(
          "SELECT id FROM challenges WHERE status='queued' ORDER BY created_at LIMIT 1",
        )
        .get() as { id: string } | undefined;
      if (!row) return;
      this.busy = true;
      const challenge = this.get(row.id);
      this.save({ ...challenge, status: "running" });
      try {
        const result = await this.execute(`audit-${challenge.id}`, {
          orderId: challenge.claim.referenceOrderId,
          auditId: challenge.id,
          auditKey: this.publicKey,
          apiUrl: config.apiUrl,
          solanaRpc: config.solanaRpc,
          programId: config.program,
          nownodesKey: config.nownodesKey,
        });
        this.save({
          ...challenge,
          status: "complete",
          result: parseAuditOutput(result.output, challenge.claim),
          transcript: result.transcript,
        });
      } catch {
        this.save({
          ...challenge,
          status: "failed",
          error:
            "Independent audit unavailable. Use the recorded proof or retry.",
        });
      } finally {
        this.busy = false;
      }
    };
    const timer = setInterval(() => void tick(), 1000);
    void tick();
    return () => clearInterval(timer);
  }
}
