import { sha256 } from "@noble/hashes/sha256";
// JSON canonicalization deliberately rejects non-finite numbers and undefined.
export function canonical(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(",")}}`;
  throw new Error("NON_CANONICAL_VALUE");
}
export function hash(value: unknown): string {
  return Array.from(sha256(new TextEncoder().encode(canonical(value))), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
