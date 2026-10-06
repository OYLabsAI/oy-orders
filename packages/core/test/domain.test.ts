import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  assertQuote,
  canonical,
  hash,
  signReceipt,
  transition,
  verifyEvidence,
  type Order,
} from "../src/domain.ts";
const keys = generateKeyPairSync("ed25519");
function fixture(): Order {
  const now = Date.now();
  const input = {
    solanaWallet: "Vote111111111111111111111111111111111111111",
    cardanoWallet: "addr1q" + "a".repeat(97),
    scenario: "success" as const,
  };
  const o: Order = {
    id: "test-order",
    mode: "rehearsal",
    status: "verifying",
    createdAt: now,
    deadline: now + 60000,
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
    sellerKey: keys.publicKey
      .export({ type: "spki", format: "pem" })
      .toString(),
  };
  o.quote = {
    orderId: o.id,
    network: "cardano:preprod",
    asset: "lovelace",
    amount: "2000000",
    recipient: o.seller,
    expiresAt: o.deadline,
    resource: "https://example.com/paid/report",
  };
  o.quoteHash = hash(o.quote);
  o.report = {
    inputHash: o.inputHash,
    solanaWallet: input.solanaWallet,
    cardanoWallet: input.cardanoWallet,
    facts: [
      {
        network: "solana:mainnet",
        wallet: input.solanaWallet,
        tx: "tx1",
        slot: "1",
        fee: "5000",
        confirmed: true,
      },
    ],
  };
  o.payment = {
    tx: "a".repeat(64),
    recipient: o.seller,
    amount: "2000000",
    network: "cardano:preprod",
    asset: "lovelace",
    fee: "170000",
    confirmed: true,
  };
  o.receipt = signReceipt(
    {
      orderId: o.id,
      quoteHash: o.quoteHash,
      paymentHash: o.payment.tx,
      recipient: o.seller,
      network: "cardano:preprod",
      asset: "lovelace",
      amount: "2000000",
      resultHash: hash(o.report),
    },
    keys.privateKey,
  );
  return o;
}
test("canonical digest is stable across object key insertion order", () => {
  assert.equal(hash({ b: "2", a: "1" }), hash({ a: "1", b: "2" }));
  assert.throws(() => canonical({ a: undefined }));
});
test("valid signed receipt and independently fetched facts pass", () => {
  const o = fixture();
  assert.equal(verifyEvidence(o, o.payment!, o.report!.facts).accepted, true);
});
for (const [name, change] of Object.entries<(o: Order) => void>({
  "forged seller signature": (o) => {
    o.receipt!.signature = "AAAA";
  },
  "modified result": (o) => {
    o.report!.facts[0].fee = "6";
  },
  "wrong payment recipient": (o) => {
    o.payment!.recipient = "attacker";
  },
  "wrong payment network": (o) => {
    o.payment!.network = "cardano:mainnet";
  },
  "unconfirmed payment": (o) => {
    o.payment!.confirmed = false;
  },
  underpayment: (o) => {
    o.payment!.amount = "1";
  },
  "excess network fee": (o) => {
    o.payment!.fee = "1000001";
  },
  "expired order": (o) => {
    o.deadline = Date.now() - 1;
  },
  "receipt from another order": (o) => {
    o.receipt!.orderId = "other";
  },
  "changed input wallet": (o) => {
    o.report!.solanaWallet = "other";
  },
  "changed reserved quote": (o) => {
    o.quote!.amount = "1";
  },
}))
  test(`rejects ${name}`, () => {
    const o = fixture();
    const facts = structuredClone(o.report!.facts);
    change(o);
    assert.equal(verifyEvidence(o, o.payment!, facts).accepted, false);
  });
test("missing or duplicate source facts reject", () => {
  const o = fixture();
  assert.equal(verifyEvidence(o, o.payment!, []).accepted, false);
  o.report!.facts.push(o.report!.facts[0]);
  assert.equal(verifyEvidence(o, o.payment!, o.report!.facts).accepted, false);
});
test("signer rejects quote over ceiling, wrong supplier, asset, network and expiry before payment", () => {
  const o = fixture();
  for (const patch of [
    { amount: "2000001" },
    { recipient: "other" },
    { asset: "token" },
    { network: "cardano:mainnet" },
    { expiresAt: Date.now() - 1 },
    { amount: "-1" },
    { orderId: "other" },
  ])
    assert.throws(() => assertQuote(o, { ...o.quote!, ...patch } as any));
});
test("settlement and refund are terminal and mutually exclusive", () => {
  const o = fixture();
  const settled = transition(o, "settled");
  assert.throws(() => transition(settled, "refunded"));
  assert.throws(() => transition(settled, "settled"));
  const expired = transition(o, "expired");
  const refunded = transition(expired, "refunded");
  assert.throws(() => transition(refunded, "settled"));
});
