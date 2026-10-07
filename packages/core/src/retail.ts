import type { OrderInput, Report } from "./types.ts";
import { hash } from "./canonical.ts";

export const COFFEE_PASS = {
  sku: "coffee-pass" as const,
  name: "OY Coffee Club",
  description: "A one-use digital demo coffee pass",
  reward: "10000000",
  supplierPrice: "2000000",
};

export function taskInput(input: OrderInput) {
  return {
    solanaWallet: input.solanaWallet,
    cardanoWallet: input.cardanoWallet,
    ...(input.retail ? { retail: input.retail } : {}),
  };
}

export function passMatchesTask(input: OrderInput, report: Report) {
  return (
    !!input.retail &&
    input.retail.sku === COFFEE_PASS.sku &&
    /^[a-f0-9]{64}$/.test(input.retail.commitment) &&
    !!report.retail &&
    report.facts.length === 0 &&
    hash(report.retail) === hash(input.retail)
  );
}
