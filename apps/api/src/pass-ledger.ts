import { createHash, timingSafeEqual } from "node:crypto";
import type { Store } from "./store.ts";

export type PassRow = {
  id: string;
  order_id: string;
  access_hash: string;
  token_hash: string;
  created_at: number;
  used_at: number | null;
};
export const credentialHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function matches(value: string, expected: string) {
  return (
    /^[a-f0-9]{64}$/.test(expected) &&
    timingSafeEqual(
      Buffer.from(credentialHash(value), "hex"),
      Buffer.from(expected, "hex"),
    )
  );
}

// Tokens and checkout access keys are stored only as digests. Redemption is
// an atomic conditional write, so two scanners cannot both accept one pass.
export class PassLedger {
  constructor(private store: Store) {
    store.db.exec(`CREATE TABLE IF NOT EXISTS retail_passes(
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
      access_hash TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      used_at INTEGER
    )`);
  }
  find(id: string) {
    return this.store.db
      .prepare("SELECT * FROM retail_passes WHERE id=?")
      .get(id) as PassRow | undefined;
  }
  owned(id: string, access: string) {
    const row = this.find(id);
    if (!row || !matches(access, row.access_hash))
      throw Error("PASS_NOT_FOUND");
    return row;
  }
  byToken(orderId: string, token: string) {
    const row = this.store.db
      .prepare("SELECT * FROM retail_passes WHERE order_id=?")
      .get(orderId) as PassRow | undefined;
    if (!row || !matches(token, row.token_hash)) throw Error("PASS_NOT_FOUND");
    return row;
  }
  insert(
    id: string,
    orderId: string,
    access: string,
    token: string,
    now: number,
  ) {
    this.store.db
      .prepare(
        "INSERT INTO retail_passes(id,order_id,access_hash,token_hash,created_at) VALUES(?,?,?,?,?)",
      )
      .run(id, orderId, credentialHash(access), credentialHash(token), now);
  }
  countSince(since: number) {
    return this.store.db
      .prepare("SELECT count(*) AS n FROM retail_passes WHERE created_at>?")
      .get(since)!.n as number;
  }
  active() {
    return this.store.db
      .prepare(
        "SELECT p.order_id FROM retail_passes p JOIN orders o ON p.order_id=o.id WHERE json_extract(o.body,'$.status') IN ('created','funded','reserved','purchasing','paid','verifying') LIMIT 1",
      )
      .get() as { order_id: string } | undefined;
  }
  pending() {
    return this.store.db
      .prepare(
        "SELECT p.order_id FROM retail_passes p JOIN orders o ON p.order_id=o.id WHERE json_extract(o.body,'$.status')='created' ORDER BY p.created_at LIMIT 1",
      )
      .get() as { order_id: string } | undefined;
  }
  redeem(orderId: string, token: string, now: number) {
    this.byToken(orderId, token);
    const result = this.store.db
      .prepare(
        "UPDATE retail_passes SET used_at=? WHERE order_id=? AND token_hash=? AND used_at IS NULL",
      )
      .run(now, orderId, credentialHash(token));
    return result.changes === 1;
  }
}
