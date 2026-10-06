import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../src/store.ts";
import { runOrder } from "../src/worker.ts";
import { sellerPublicKey } from "../src/config.ts";
import { hash, type Order } from "../../../packages/core/src/domain.ts";
function order(scenario: "success" | "tampered" | "expiry" = "success"): Order {
  const input = {
    solanaWallet: "Vote111111111111111111111111111111111111111",
    cardanoWallet: "addr1q" + "a".repeat(97),
    scenario,
  };
  return {
    id: randomUUID(),
    mode: "rehearsal",
    status: "funded",
    createdAt: Date.now(),
    deadline: Date.now() + 60000,
    input,
    inputHash: hash({
      solanaWallet: input.solanaWallet,
      cardanoWallet: input.cardanoWallet,
    }),
    reward: "10000000",
    ceiling: "2000000",
    feeCeiling: "1000000",
    buyer: "buyer",
    worker: "worker",
    seller: "seller",
    sellerKey: sellerPublicKey,
  };
}
test("full rehearsal settles with signed receipt and all checks", async () => {
  const s = new Store(":memory:");
  const o = s.save(order());
  await runOrder(s, o.id, true);
  assert.equal(s.get(o.id).status, "settled");
  assert.equal(s.get(o.id).verification?.accepted, true);
  assert.equal(s.events(o.id).at(-1)?.step, "settled");
  s.close();
});
test("tampering retains reward and expiry allows refund", async () => {
  for (const [scenario, status] of [
    ["tampered", "rejected"],
    ["expiry", "expired"],
  ] as const) {
    const s = new Store(":memory:");
    const o = s.save(order(scenario));
    await runOrder(s, o.id, true);
    assert.equal(s.get(o.id).status, status);
    s.close();
  }
});
test("jobs are unique and claimed once; restart recovers a claimed job", () => {
  const s = new Store(":memory:");
  const o = s.save(order());
  s.enqueue(o.id);
  s.enqueue(o.id);
  assert.equal(s.next(), o.id);
  assert.equal(s.next(), undefined);
  s.recover();
  assert.equal(s.next(), o.id);
  s.finish(o.id);
  s.recover();
  assert.equal(s.next(), undefined);
  s.close();
});
test("payment claim rejects cross-order reuse and permits same-order recovery", () => {
  const s = new Store(":memory:");
  const a = s.save(order()),
    b = s.save(order());
  s.claimPayment("tx", a.id);
  s.claimPayment("tx", a.id);
  assert.throws(() => s.claimPayment("tx", b.id), /PAYMENT_REUSED/);
  assert.throws(() => s.claimPayment("other-tx", a.id), /PAYMENT_REUSED/);
  s.close();
});
test("restart after receipt does not purchase again", async () => {
  const s = new Store(":memory:");
  const o = s.save(order());
  await runOrder(s, o.id, true);
  const final = s.get(o.id);
  s.save({ ...final, status: "paid", verification: undefined });
  const before = s.db
    .prepare("SELECT COUNT(*) AS n FROM payment_claims")
    .get()?.n;
  await runOrder(s, o.id, true);
  assert.equal(s.get(o.id).receipt?.paymentHash, final.receipt?.paymentHash);
  assert.equal(
    s.db.prepare("SELECT COUNT(*) AS n FROM payment_claims").get()?.n,
    before,
  );
  s.close();
});
