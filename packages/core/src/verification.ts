import { hash } from "./canonical.ts";
import { taskInput, passMatchesTask } from "./retail.ts";
import { verifyShoppingPlan, type SignatureCheck } from "./shopping.ts";
import type {
  Order,
  Payment,
  SourceFact,
  Receipt,
  Verification,
  Check,
} from "./types.ts";
export function verifyWithSignature(
  order: Order,
  payment: Payment,
  sourceFacts: SourceFact[],
  signatureCheck: SignatureCheck,
  now: number,
): Verification {
  const checks: Check[] = [];
  const check = (name: string, passed: boolean, detail: string) =>
    checks.push({ name, passed, detail });
  const r = order.receipt,
    q = order.quote,
    report = order.report;
  check("Escrow deadline", now < order.deadline, "Order must be unexpired");
  check(
    "Reserved quote",
    !!q && hash(q) === order.quoteHash,
    "Immutable quote matches its reservation",
  );
  check(
    "Input binding",
    !!report &&
      hash(taskInput(order.input)) === order.inputHash &&
      report.inputHash === order.inputHash &&
      report.solanaWallet === order.input.solanaWallet &&
      report.cardanoWallet === order.input.cardanoWallet,
    "Report answers the funded task",
  );
  check(
    "Seller signature",
    !!r && signatureCheck(r, order.sellerKey),
    "Ed25519 signature by the registered seller",
  );
  check(
    "Receipt binding",
    !!r &&
      r.orderId === order.id &&
      r.quoteHash === order.quoteHash &&
      r.recipient === order.seller &&
      r.network === "cardano:preprod" &&
      r.asset === "lovelace",
    "Order, quote, seller, asset and network agree",
  );
  check(
    "Payment confirmation",
    !!r &&
      payment.confirmed &&
      payment.tx === r.paymentHash &&
      payment.network === r.network &&
      payment.asset === r.asset,
    "Observed preprod transaction is confirmed",
  );
  check(
    "Payment value",
    !!r &&
      !!q &&
      payment.recipient === order.seller &&
      BigInt(payment.amount) >= BigInt(q.amount) &&
      r.amount === q.amount &&
      BigInt(q.amount) <= BigInt(order.ceiling) &&
      BigInt(payment.fee) <= BigInt(order.feeCeiling),
    "Correct recipient and quote, within fee reserve",
  );
  check(
    "Result integrity",
    !!r && !!report && hash(report) === r.resultHash,
    "Canonical facts match signed SHA-256 digest",
  );
  const facts = report?.facts ?? [];
  const unique = new Set(facts.map((f) => `${f.network}:${f.tx}`));
  const inScope = facts.every(
    (f) =>
      f.confirmed &&
      (f.network === "solana:mainnet"
        ? f.wallet === order.input.solanaWallet
        : f.network === "cardano:mainnet" &&
          f.wallet === order.input.cardanoWallet),
  );
  check(
    order.input.retail ? "Digital pass commitment" : "Source provenance",
    order.input.retail
      ? !!report && passMatchesTask(order.input, report)
      : !!report &&
          unique.size === facts.length &&
          inScope &&
          hash(facts) === hash(sourceFacts),
    order.input.retail
      ? "One-use pass commitment matches the funded task and signed delivery"
      : "All cited facts and latest-five completeness independently re-fetched",
  );
  if (order.shopping || order.input.retail?.shoppingHash)
    check(
      "Agent shopping policy",
      verifyShoppingPlan(order, signatureCheck, now),
      "Signed offers, cheapest valid selection and budget bound to the funded task",
    );
  const failure = checks.find((c) => !c.passed);
  return {
    accepted: !failure,
    reason: failure?.name ?? "ALL_CHECKS_PASSED",
    checks,
    mode: order.mode === "rehearsal" ? "rehearsal" : "cre-simulation",
    resultHash: report ? hash(report) : "",
    timestamp: now,
  };
}
