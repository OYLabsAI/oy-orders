import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCreOutput } from "../src/cre-output.ts";

const transcript = readFileSync(
  new URL("./fixtures/cre-success.txt", import.meta.url),
  "utf8",
);
const digest =
  "52bf10a72652ed4f25443f4272856680d97d354a327fbf9a6f4e59836829933e";
test("reads complete CRE return value despite truncated user log", () => {
  const result = parseCreOutput(transcript, digest);
  assert.equal(result.accepted, true);
  assert.equal(result.checks.length, 10);
  assert.equal(
    result.checks.every((check) => check.passed),
    true,
  );
});
test("rejects logs alone, incomplete output, and a different result digest", () => {
  assert.throws(
    () => parseCreOutput('ORCA_VERIFICATION:{"accepted":true}', digest),
    /MISSING/,
  );
  assert.throws(
    () => parseCreOutput('Workflow Simulation Result:\n"{truncated', digest),
    /MALFORMED/,
  );
  assert.throws(() => parseCreOutput(transcript, "00".repeat(32)), /MISMATCH/);
});
test("never accepts a successful result containing a failed check", () => {
  const result = parseCreOutput(transcript, digest);
  result.checks[0].passed = false;
  assert.throws(
    () =>
      parseCreOutput(
        `Workflow Simulation Result:\n${JSON.stringify(JSON.stringify(result))}`,
        digest,
      ),
    /MISMATCH/,
  );
});
test("preserves genuine rejection when the tampered report has a different digest", () => {
  const result = parseCreOutput(transcript, digest);
  result.accepted = false;
  result.reason = "Result integrity";
  result.resultHash = "01".repeat(32);
  result.checks.find((check) => check.name === "Result integrity")!.passed =
    false;
  const rejected = parseCreOutput(
    `Workflow Simulation Result:\n${JSON.stringify(JSON.stringify(result))}`,
    digest,
  );
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reason, "Result integrity");
});
test("shopping execution requires its additional policy check in the complete CRE result", () => {
  assert.throws(() => parseCreOutput(transcript, digest, 11), /MISMATCH/);
  const result = parseCreOutput(transcript, digest);
  result.checks.push({
    name: "Agent shopping policy",
    passed: true,
    detail: "Committed signed offers and budget checked",
  });
  const output = `Workflow Simulation Result:\n${JSON.stringify(JSON.stringify(result))}`;
  assert.equal(parseCreOutput(output, digest, 11).accepted, true);
  assert.throws(() => parseCreOutput(output, digest), /MISMATCH/);
});
