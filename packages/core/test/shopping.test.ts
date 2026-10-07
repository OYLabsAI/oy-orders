import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  canonical,
  hash,
  verifySignature,
  signReceipt,
  verifyEvidence,
} from "../src/domain.ts";
import {
  chooseOffers,
  shoppingCommitment,
  verifyShoppingPlan,
  SHOPPING_GOAL,
} from "../src/shopping.ts";
import { taskInput } from "../src/retail.ts";
import { verifyReceiptSignature } from "../src/receipt-signature.ts";
import type { Order, SignedOffer } from "../src/types.ts";

function fixture() {
  const keys = generateKeyPairSync("ed25519");
  const o: Order = JSON.parse(
    readFileSync("docs/evidence/live-order.json", "utf8"),
  ).order;
  o.id = randomUUID();
  o.deadline = Date.now() + 60000;
  o.quoteHash = undefined;
  o.sellerKey = keys.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const terms = {
    ...o,
    resource: `https://fixture.invalid/paid/report?orderId=${o.id}`,
  };
  const offer = (
    sku = "coffee-pass",
    amount = "2000000",
    overrides = {},
  ): SignedOffer => {
    const body = {
      version: 1 as const,
      label: "Test offer",
      sku,
      quote: {
        orderId: o.id,
        network: "cardano:preprod" as const,
        asset: "lovelace" as const,
        amount,
        recipient: o.seller,
        expiresAt: o.deadline,
        resource: terms.resource,
        ...overrides,
      },
    };
    return {
      ...body,
      signature: sign(
        null,
        Buffer.from(canonical(body)),
        keys.privateKey,
      ).toString("base64"),
    };
  };
  return { keys, o, terms, offer, now: Date.now() };
}
test("the agent rejects a signed wrong item and an overpriced item, then picks the cheapest valid offer", () => {
  const f = fixture();
  const offers = [
    f.offer("music-pass", "100000"),
    f.offer("coffee-pass", "4000000"),
    f.offer("coffee-pass", "2000000"),
    f.offer("coffee-pass", "1500000"),
  ];
  const result = chooseOffers(f.terms, offers, verifySignature, f.now);
  assert.equal(result.selected, 3);
  assert.deepEqual(
    result.decisions.map((d) => d.reason),
    [
      "WRONG_ITEM",
      "PRICE_EXCEEDS_CEILING",
      "MATCHES_GOAL_AND_BUDGET",
      "MATCHES_GOAL_AND_BUDGET",
    ],
  );
});
test("altering an advertised price after signing cannot make it eligible", () => {
  const f = fixture(),
    fake = f.offer();
  fake.quote.amount = "100000";
  const result = chooseOffers(
    f.terms,
    [fake, f.offer()],
    verifySignature,
    f.now,
  );
  assert.equal(result.decisions[0].reason, "INVALID_SIGNATURE");
  assert.equal(result.selected, 1);
  assert.equal(verifyReceiptSignature(fake, f.o.sellerKey), false);
  assert.equal(verifyReceiptSignature(f.offer(), f.o.sellerKey), true);
});
test("a budget below every valid price authorizes no purchase", () => {
  const f = fixture();
  assert.equal(
    chooseOffers(
      { ...f.terms, ceiling: "1000000" },
      [f.offer()],
      verifySignature,
      f.now,
    ).selected,
    null,
  );
});
test("valid signatures cannot change the order, recipient, resource, network or expiry", () => {
  const f = fixture();
  for (const [overrides, reason] of [
    [{ orderId: randomUUID() }, "WRONG_ORDER"],
    [{ recipient: "attacker" }, "WRONG_RECIPIENT"],
    [{ resource: "https://attacker.invalid/pay" }, "WRONG_RESOURCE"],
    [{ network: "cardano:mainnet" }, "WRONG_ASSET_OR_NETWORK"],
    [{ expiresAt: f.now - 1 }, "EXPIRED_QUOTE"],
  ] as const) {
    const result = chooseOffers(
      f.terms,
      [f.offer("coffee-pass", "2000000", overrides)],
      verifySignature,
      f.now,
    );
    assert.equal(result.selected, null);
    assert.equal(result.decisions[0].reason, reason);
  }
});
test("a signature from an unregistered seller is rejected", () => {
  const f = fixture(),
    other = fixture();
  assert.equal(
    chooseOffers(
      { ...f.terms, sellerKey: other.o.sellerKey },
      [f.offer()],
      verifySignature,
      f.now,
    ).selected,
    null,
  );
});
test("CRE-compatible verification rechecks the committed shopping plan and detects selection tampering", () => {
  const f = fixture(),
    offers = [f.offer("music-pass", "100000"), f.offer()];
  f.o.shopping = {
    goal: SHOPPING_GOAL,
    budget: f.o.ceiling,
    offers,
    ...chooseOffers(f.terms, offers, verifySignature, f.now),
    evaluatedAt: f.now,
  };
  f.o.quote = offers[1].quote;
  f.o.quoteHash = hash(f.o.quote);
  f.o.input.retail = {
    sku: "coffee-pass",
    commitment: "a".repeat(64),
    shoppingHash: shoppingCommitment(f.o.shopping),
  };
  f.o.inputHash = hash(taskInput(f.o.input));
  f.o.report = {
    inputHash: f.o.inputHash,
    solanaWallet: f.o.input.solanaWallet,
    cardanoWallet: f.o.input.cardanoWallet,
    facts: [],
    retail: { ...f.o.input.retail },
  };
  f.o.receipt = signReceipt(
    {
      orderId: f.o.id,
      quoteHash: f.o.quoteHash,
      paymentHash: f.o.payment!.tx,
      recipient: f.o.seller,
      network: "cardano:preprod",
      asset: "lovelace",
      amount: f.o.quote.amount,
      resultHash: hash(f.o.report),
    },
    f.keys.privateKey,
  );
  assert.equal(verifyShoppingPlan(f.o, verifyReceiptSignature, f.now), true);
  assert.equal(verifyEvidence(f.o, f.o.payment!, [], f.now).accepted, true);
  f.o.shopping.selected = 0;
  assert.equal(
    verifyEvidence(f.o, f.o.payment!, [], f.now).reason,
    "Agent shopping policy",
  );
  f.o.shopping.selected = 1;
  f.o.shopping.offers[0].quote.amount = "150000";
  assert.equal(verifyShoppingPlan(f.o, verifyReceiptSignature, f.now), false);
});
test("missing signed offers or a changed budget cannot replace a committed plan", () => {
  const f = fixture(),
    offers = [f.offer()];
  f.o.shopping = {
    goal: SHOPPING_GOAL,
    budget: f.o.ceiling,
    offers,
    ...chooseOffers(f.terms, offers, verifySignature, f.now),
    evaluatedAt: f.now,
  };
  f.o.quote = offers[0].quote;
  f.o.quoteHash = hash(f.o.quote);
  f.o.input.retail = {
    sku: "coffee-pass",
    commitment: "a".repeat(64),
    shoppingHash: shoppingCommitment(f.o.shopping),
  };
  f.o.shopping.budget = "3000000";
  assert.equal(verifyShoppingPlan(f.o, verifySignature, f.now), false);
  f.o.shopping = undefined;
  assert.equal(verifyShoppingPlan(f.o, verifySignature, f.now), false);
});
