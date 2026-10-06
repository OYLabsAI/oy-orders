import { test } from "node:test";
import assert from "node:assert/strict";
import { koiosPayment } from "../src/cardano-payment.ts";
const tx = "a".repeat(64);
const proof = () => [
  {
    tx_hash: tx,
    block_hash: "confirmed",
    fee: "170000",
    outputs: [
      { payment_addr: { bech32: "seller" }, value: "1000000" },
      { payment_addr: { bech32: "seller" }, value: "1000000" },
      { payment_addr: { bech32: "buyer" }, value: "9999999" },
    ],
  },
];
test("Koios proof sums only historical seller outputs and requires the exact confirmed transaction", () => {
  assert.equal(koiosPayment(tx, "seller", proof()).amount, "2000000");
  assert.throws(() => koiosPayment(tx, "seller", []), /NOT_CONFIRMED/);
  const altered = proof();
  altered[0].tx_hash = "b".repeat(64);
  assert.throws(() => koiosPayment(tx, "seller", altered), /HASH_MISMATCH/);
  altered[0].tx_hash = tx;
  altered[0].block_hash = "";
  assert.throws(() => koiosPayment(tx, "seller", altered), /NOT_CONFIRMED/);
  altered[0].block_hash = "confirmed";
  altered[0].outputs[0].value = "-1";
  assert.throws(
    () => koiosPayment(tx, "seller", altered),
    /INVALID_PAYMENT_SOURCE/,
  );
});
