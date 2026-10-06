import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyReceiptSignature } from "../../../packages/core/src/receipt-signature.ts";
import { verifyWithSignature } from "../../../packages/core/src/verification.ts";
import type { Order } from "../../../packages/core/src/types.ts";

test("browser replay detects one changed fee while the genuine seller signature stays valid", () => {
  const order: Order = JSON.parse(
    readFileSync("docs/evidence/live-order-recovered.json", "utf8"),
  ).order;
  const snapshot = JSON.stringify(order);
  const original = verifyWithSignature(
    order,
    order.payment!,
    order.report!.facts,
    verifyReceiptSignature,
    order.verification!.timestamp,
  );
  assert.equal(original.accepted, true);
  const changed = structuredClone(order);
  changed.report!.facts[0].fee = (
    BigInt(changed.report!.facts[0].fee) + 1n
  ).toString();
  const result = verifyWithSignature(
    changed,
    order.payment!,
    order.report!.facts,
    verifyReceiptSignature,
    order.verification!.timestamp,
  );
  assert.equal(result.accepted, false);
  assert.equal(
    result.checks.find((c) => c.name === "Seller signature")?.passed,
    true,
  );
  assert.equal(
    result.checks.find((c) => c.name === "Result integrity")?.passed,
    false,
  );
  assert.equal(
    result.checks.find((c) => c.name === "Source provenance")?.passed,
    false,
  );
  assert.equal(JSON.stringify(order), snapshot);
});
