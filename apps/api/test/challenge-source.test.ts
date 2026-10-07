import { test } from "node:test";
import assert from "node:assert/strict";
import { recentAuditFact } from "../src/challenge-source.ts";
import { solanaTransactionFact } from "../../../packages/core/src/audit.ts";

const transaction = {
  slot: 123,
  meta: { err: null, fee: 5000 },
  transaction: { message: { accountKeys: ["wallet"] } },
};
test("Live audit skips a pruned transaction and pins a readable finalized one", async () => {
  const fact = await recentAuditFact("wallet", async (method, params) => {
    if (method === "getSignaturesForAddress")
      return [
        { signature: "old", err: null },
        { signature: "recent", err: null },
      ];
    return params[0] === "old" ? null : transaction;
  });
  assert.equal(fact.tx, "recent");
  assert.equal(fact.fee, "5000");
});
test("Missing source data never becomes an accepted fact", async () => {
  await assert.rejects(
    recentAuditFact("wallet", async (method) =>
      method === "getSignaturesForAddress"
        ? [{ signature: "pruned", err: null }]
        : null,
    ),
    /LIVE_SOURCE_UNAVAILABLE/,
  );
  assert.equal(
    solanaTransactionFact("different-wallet", "tx", transaction),
    undefined,
  );
  assert.equal(
    solanaTransactionFact("wallet", "tx", {
      ...transaction,
      meta: { err: { failed: true }, fee: 5000 },
    }),
    undefined,
  );
  assert.equal(
    solanaTransactionFact("wallet", "tx", {
      ...transaction,
      meta: { err: null, fee: -1 },
    }),
    undefined,
  );
});
