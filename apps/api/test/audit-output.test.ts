import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auditDecision,
  type AuditClaim,
} from "../../../packages/core/src/audit.ts";
import { parseAuditOutput, challengeInput } from "../src/challenges.ts";
const claim: AuditClaim = {
  id: "00000000-0000-4000-8000-000000000000",
  referenceOrderId: "reference",
  issuedAt: 1000,
  facts: [
    {
      network: "solana:mainnet",
      wallet: "sol",
      tx: "s",
      slot: "1",
      fee: "5",
      confirmed: true,
    },
    {
      network: "cardano:mainnet",
      wallet: "ada",
      tx: "a",
      slot: "2",
      fee: "17",
      confirmed: true,
    },
  ],
};
const result = auditDecision(claim, claim.facts, true, true, true, 2000);
const output = (value: unknown) =>
  "Workflow Simulation Result: " + JSON.stringify(JSON.stringify(value));
test("Audit result must bind this exact challenge and cannot forge acceptance", () => {
  assert.equal(parseAuditOutput(output(result), claim).accepted, true);
  assert.throws(() =>
    parseAuditOutput(
      output({ ...result, id: "11111111-1111-4111-8111-111111111111" }),
      claim,
    ),
  );
  assert.throws(() =>
    parseAuditOutput(output({ ...result, claimHash: "a".repeat(64) }), claim),
  );
  assert.throws(() =>
    parseAuditOutput(
      output({
        ...result,
        checks: result.checks.map((c, i) => (i ? c : { ...c, passed: false })),
      }),
      claim,
    ),
  );
});
test("Public audit input cannot choose destinations, signing keys or settlement actions", () => {
  assert.equal(
    challengeInput.safeParse({ network: "solana", change: "tiny" }).success,
    true,
  );
  for (const extra of [
    { url: "http://localhost/admin" },
    { key: "private" },
    { settle: true },
    { transaction: "unknown" },
  ])
    assert.equal(
      challengeInput.safeParse({ network: "solana", change: "tiny", ...extra })
        .success,
      false,
    );
});
