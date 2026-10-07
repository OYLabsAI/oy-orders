import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { PassLedger, credentialHash } from "../src/pass-ledger.ts";
import type { Order } from "../../../packages/core/src/domain.ts";
const secret = () => randomBytes(32).toString("hex");
function fixture(s: Store, ledger: PassLedger, createdAt = Date.now()) {
  const order: Order = JSON.parse(
    readFileSync("docs/evidence/live-order.json", "utf8"),
  ).order;
  order.id = randomUUID();
  order.createdAt = createdAt;
  s.save(order);
  const id = randomUUID(),
    access = secret(),
    token = secret();
  ledger.insert(id, order.id, access, token, createdAt);
  return { id, access, token, order };
}
test("checkout access and pass tokens are private, distinct credentials", () => {
  const s = new Store(":memory:"),
    l = new PassLedger(s),
    a = fixture(s, l);
  const row = l.find(a.id)!;
  assert.equal(row.access_hash, credentialHash(a.access));
  assert.equal(row.token_hash, credentialHash(a.token));
  assert.equal(JSON.stringify(row).includes(a.access), false);
  assert.equal(JSON.stringify(row).includes(a.token), false);
  assert.throws(() => l.owned(a.id, a.token), /PASS_NOT_FOUND/);
  assert.throws(() => l.byToken(a.order.id, a.access), /PASS_NOT_FOUND/);
  assert.throws(() => l.owned(randomUUID(), a.access), /PASS_NOT_FOUND/);
  s.close();
});
test("a copied credential cannot cross orders or consume another pass", () => {
  const s = new Store(":memory:"),
    l = new PassLedger(s),
    a = fixture(s, l),
    b = fixture(s, l);
  assert.throws(() => l.owned(b.id, a.access), /PASS_NOT_FOUND/);
  assert.throws(() => l.redeem(b.order.id, a.token, 100), /PASS_NOT_FOUND/);
  assert.equal(l.byToken(b.order.id, b.token).used_at, null);
  assert.equal(l.redeem(a.order.id, a.token, 100), true);
  assert.equal(l.redeem(a.order.id, a.token, 200), false);
  assert.equal(l.byToken(a.order.id, a.token).used_at, 100);
  s.close();
});
test("two cashier connections cannot both accept a pass, and restart retains use", () => {
  const dir = mkdtempSync(join(tmpdir(), "oy-pass-")),
    path = join(dir, "orders.sqlite");
  const a = new Store(path),
    al = new PassLedger(a),
    p = fixture(a, al);
  const b = new Store(path),
    bl = new PassLedger(b);
  // Both readers see ready before either conditional write executes.
  assert.equal(al.byToken(p.order.id, p.token).used_at, null);
  assert.equal(bl.byToken(p.order.id, p.token).used_at, null);
  assert.equal(al.redeem(p.order.id, p.token, 111), true);
  assert.equal(bl.redeem(p.order.id, p.token, 222), false);
  a.close();
  b.close();
  const restart = new Store(path),
    rl = new PassLedger(restart);
  assert.equal(rl.byToken(p.order.id, p.token).used_at, 111);
  assert.equal(rl.redeem(p.order.id, p.token, 333), false);
  restart.close();
  rmSync(dir, { recursive: true });
});
test("the rolling demo count persists and unfinished checkout remains detectable", () => {
  const s = new Store(":memory:"),
    l = new PassLedger(s),
    now = Date.now();
  fixture(s, l, now - 86400001);
  for (let i = 0; i < 5; i++) fixture(s, l, now - i);
  assert.equal(l.countSince(now - 86400000), 5);
  const p = fixture(s, l);
  s.save({ ...p.order, status: "created" });
  assert.equal(l.pending()?.order_id, p.order.id);
  assert.equal(l.active()?.order_id, p.order.id);
  s.save({ ...p.order, status: "settled" });
  assert.equal(l.pending(), undefined);
  assert.equal(l.active(), undefined);
  s.close();
});
