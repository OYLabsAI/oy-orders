import { test } from "node:test";
import assert from "node:assert/strict";
import {
  koiosPayment,
  blockfrostPayment,
  assertPreprodGenesis,
} from "../src/cardano-payment.ts";
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
test("Blockfrost-compatible proof rejects wrong hashes, failed scripts and negative quantities", () => {
  const info = {
    hash: tx,
    block: "confirmed",
    fees: "170000",
    valid_contract: true,
  };
  const utxos = {
    hash: tx,
    outputs: [
      {
        address: "seller",
        amount: [
          { unit: "lovelace", quantity: "2000000" },
          { unit: "token", quantity: "8" },
        ],
      },
      { address: "buyer", amount: [{ unit: "lovelace", quantity: "9999999" }] },
    ],
  };
  assert.equal(blockfrostPayment(tx, "seller", info, utxos).amount, "2000000");
  assert.throws(
    () =>
      blockfrostPayment(tx, "seller", { ...info, hash: "b".repeat(64) }, utxos),
    /HASH_MISMATCH/,
  );
  assert.throws(
    () =>
      blockfrostPayment(tx, "seller", info, { ...utxos, hash: "b".repeat(64) }),
    /HASH_MISMATCH/,
  );
  assert.throws(
    () =>
      blockfrostPayment(
        tx,
        "seller",
        { ...info, valid_contract: false },
        utxos,
      ),
    /INVALID_PAYMENT_SOURCE/,
  );
  utxos.outputs[0].amount[0].quantity = "-1";
  assert.throws(
    () => blockfrostPayment(tx, "seller", info, utxos),
    /INVALID_PAYMENT_SOURCE/,
  );
});
test("Cardano endpoint must identify preprod before trusting a payment", () => {
  assert.doesNotThrow(() => assertPreprodGenesis({ network_magic: 1 }));
  for (const network of [
    null,
    {},
    { network_magic: 2 },
    { network_magic: 764824073 },
  ])
    assert.throws(() => assertPreprodGenesis(network), /NETWORK_MISMATCH/);
});
