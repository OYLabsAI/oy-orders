import type { Check, SourceFact } from "./types.ts";
import { hash } from "./canonical.ts";

// A challenge is a read-only claim audit. It never authorizes a payment.
export type AuditClaim = {
  id: string;
  referenceOrderId: string;
  issuedAt: number;
  facts: SourceFact[];
};
export type AuditResult = {
  id: string;
  mode: "cre-simulation";
  accepted: boolean;
  timestamp: number;
  claimHash: string;
  checks: Check[];
  differences: {
    network: string;
    tx: string;
    claimed: string;
    actual: string;
    field: string;
  }[];
};
export function compareAuditFacts(claim: AuditClaim, actual: SourceFact[]) {
  return claim.facts.flatMap((fact) => {
    const source = actual.find(
      (s) =>
        s.network === fact.network &&
        s.tx === fact.tx &&
        s.wallet === fact.wallet,
    );
    if (!source)
      return [
        {
          network: fact.network,
          tx: fact.tx,
          field: "transaction",
          claimed: "confirmed",
          actual: "not found",
        },
      ];
    return (["fee", "slot", "confirmed"] as const)
      .filter((field) => fact[field] !== source[field])
      .map((field) => ({
        network: fact.network,
        tx: fact.tx,
        field,
        claimed: String(fact[field]),
        actual: String(source[field]),
      }));
  });
}
export function auditDecision(
  claim: AuditClaim,
  actual: SourceFact[],
  signatureValid: boolean,
  referenceValid: boolean,
  paymentValid: boolean,
  now: number,
): AuditResult {
  const differences = compareAuditFacts(claim, actual);
  const checks = [
    {
      name: "Signed claim",
      passed: signatureValid,
      detail: "Dedicated challenge signer; no production receipt changes",
    },
    {
      name: "Recent challenge",
      passed: now >= claim.issuedAt && now - claim.issuedAt < 300000,
      detail: "Challenge issued within five minutes",
    },
    {
      name: "Real escrow reference",
      passed: referenceValid,
      detail: "Recorded order matches its actual Solana Devnet account",
    },
    {
      name: "Cardano purchase",
      passed: paymentValid,
      detail: "Original 2 tADA purchase independently observed; no new charge",
    },
    {
      name: "Both networks",
      passed:
        claim.facts.length === 2 &&
        new Set(claim.facts.map((f) => f.network)).size === 2 &&
        actual.length === 2,
      detail: "One immutable transaction on Solana and one on Cardano",
    },
    {
      name: "Source provenance",
      passed: differences.length === 0 && claim.facts.length > 0,
      detail: differences.length
        ? "Claim disagrees with fresh NOWNodes reads"
        : "Claim agrees with fresh NOWNodes reads",
    },
  ];
  return {
    id: claim.id,
    mode: "cre-simulation",
    accepted: checks.every((c) => c.passed),
    timestamp: now,
    claimHash: hash(claim),
    checks,
    differences,
  };
}
