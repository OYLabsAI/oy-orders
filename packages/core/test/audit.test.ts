import { test } from "node:test";
import assert from "node:assert/strict";
import { auditDecision, type AuditClaim } from "../src/audit.ts";
const claim: AuditClaim = {
  id: "00000000-0000-4000-8000-000000000000",
  referenceOrderId: "reference",
  issuedAt: 1000,
  facts: [
    {
      network: "solana:mainnet",
      wallet: "wallet-sol",
      tx: "tx-sol",
      slot: "1",
      fee: "5000",
      confirmed: true,
    },
    {
      network: "cardano:mainnet",
      wallet: "wallet-ada",
      tx: "tx-ada",
      slot: "2",
      fee: "171000",
      confirmed: true,
    },
  ],
};
for (const network of ["solana:mainnet", "cardano:mainnet"])
  test(`Valid signature cannot hide one-unit false fee on ${network}`, () => {
    const lie = structuredClone(claim);
    const fact = lie.facts.find((f) => f.network === network)!;
    fact.fee = (BigInt(fact.fee) + 1n).toString();
    const result = auditDecision(lie, claim.facts, true, true, true, 2000);
    assert.equal(result.accepted, false);
    assert.equal(result.checks[0].passed, true);
    assert.equal(
      result.differences[0].actual,
      claim.facts.find((f) => f.network === network)!.fee,
    );
  });
test("Truth passes only when signature, payment, reference and freshness also pass", () => {
  assert.equal(
    auditDecision(claim, claim.facts, true, true, true, 2000).accepted,
    true,
  );
  for (const gates of [
    [false, true, true],
    [true, false, true],
    [true, true, false],
  ])
    assert.equal(
      auditDecision(
        claim,
        claim.facts,
        ...(gates as [boolean, boolean, boolean]),
        2000,
      ).accepted,
      false,
    );
  assert.equal(
    auditDecision(claim, claim.facts, true, true, true, 301000).accepted,
    false,
  );
});
test("A duplicate-network claim and an absent transaction are rejected", () => {
  const duplicate = structuredClone(claim);
  duplicate.facts[1] = { ...duplicate.facts[0] };
  assert.equal(
    auditDecision(duplicate, claim.facts, true, true, true, 2000).accepted,
    false,
  );
  assert.equal(
    auditDecision(claim, [claim.facts[0]], true, true, true, 2000).accepted,
    false,
  );
});
