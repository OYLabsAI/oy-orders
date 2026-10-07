import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  hash,
  signReceipt,
  verifyEvidence,
  type Order,
} from "../src/domain.ts";
import { taskInput, passMatchesTask } from "../src/retail.ts";
function fixture() {
  const o: Order = JSON.parse(
    readFileSync("docs/evidence/live-order.json", "utf8"),
  ).order;
  const keys = generateKeyPairSync("ed25519");
  o.sellerKey = keys.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  o.deadline = Date.now() + 60000;
  o.input.retail = { sku: "coffee-pass", commitment: "a".repeat(64) };
  o.inputHash = hash(taskInput(o.input));
  o.report = {
    inputHash: o.inputHash,
    solanaWallet: o.input.solanaWallet,
    cardanoWallet: o.input.cardanoWallet,
    facts: [],
    retail: { ...o.input.retail },
  };
  const resign = () => {
    const { signature: _previous, ...unsigned } = o.receipt!;
    o.receipt = signReceipt(
      { ...unsigned, resultHash: hash(o.report) },
      keys.privateKey,
    );
  };
  resign();
  return { o, resign };
}
test("a supplier-signed pass bound to funded terms passes delivery verification", () => {
  const { o } = fixture();
  assert.equal(passMatchesTask(o.input, o.report!), true);
  assert.equal(verifyEvidence(o, o.payment!, []).accepted, true);
});
test("a valid seller signature cannot substitute a different digital pass", () => {
  const { o, resign } = fixture();
  o.report!.retail!.commitment = "b".repeat(64);
  resign();
  const result = verifyEvidence(o, o.payment!, []);
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "Digital pass commitment");
  assert.equal(
    result.checks.find((c) => c.name === "Seller signature")?.passed,
    true,
  );
});
test("changing the requested pass after funding breaks immutable input binding", () => {
  const { o } = fixture();
  o.input.retail!.commitment = "b".repeat(64);
  const result = verifyEvidence(o, o.payment!, []);
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "Input binding");
});
