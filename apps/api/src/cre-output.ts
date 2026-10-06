import type { Verification } from "../../../packages/core/src/domain.ts";

// CRE truncates user logs; the simulation result contains the complete return value.
export function parseCreOutput(
  output: string,
  expectedHash: string,
): Verification {
  const marker = "Workflow Simulation Result:";
  const start = output.lastIndexOf(marker);
  if (start < 0) throw new Error("CRE_RESULT_MISSING");
  const line = output
    .slice(start + marker.length)
    .trimStart()
    .split(/\r?\n/, 1)[0];
  let result: Verification;
  try {
    const value = JSON.parse(line);
    result = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new Error("CRE_RESULT_MALFORMED");
  }
  if (
    !result ||
    result.mode !== "cre-simulation" ||
    !/^[0-9a-f]{64}$/.test(result.resultHash) ||
    (result.accepted && result.resultHash !== expectedHash) ||
    typeof result.accepted !== "boolean" ||
    typeof result.reason !== "string" ||
    !Number.isFinite(result.timestamp) ||
    !Array.isArray(result.checks) ||
    result.checks.length !== 10 ||
    result.checks.some(
      (check) =>
        !check ||
        typeof check.name !== "string" ||
        typeof check.detail !== "string" ||
        typeof check.passed !== "boolean",
    ) ||
    (result.accepted && result.checks.some((check) => !check.passed))
  )
    throw new Error("CRE_RESULT_MISMATCH");
  return result;
}
