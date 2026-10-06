import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
mkdirSync(".local", { recursive: true });
const prior = existsSync(".local/solana-build.json")
  ? JSON.parse(readFileSync(".local/solana-build.json", "utf8"))
  : null;
const response = await fetch("https://api.solpg.io/build", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    files: [
      ["/src/lib.rs", readFileSync("programs/orca-orders/src/lib.rs", "utf8")],
    ],
    ...(prior?.uuid ? { uuid: prior.uuid } : {}),
  }),
});
if (!response.ok) throw new Error(`BUILD_HTTP_${response.status}`);
const result = await response.json();
const uuid = result.uuid ?? prior?.uuid;
writeFileSync(".local/solana-build.json", JSON.stringify({ ...result, uuid }));
console.log(result.stderr);
if (!/Finished release/.test(result.stderr ?? ""))
  throw new Error("PROGRAM_COMPILATION_FAILED");
const binary = await fetch(`https://api.solpg.io/deploy/${uuid}`);
if (!binary.ok) throw new Error("BUILD_BINARY_UNAVAILABLE");
const bytes = Buffer.from(await binary.arrayBuffer());
if (bytes.subarray(0, 4).toString("hex") !== "7f454c46")
  throw new Error("INVALID_ELF");
writeFileSync(".local/orca_orders.so", bytes);
mkdirSync("docs/evidence", { recursive: true });
writeFileSync("docs/evidence/orca_orders.so", bytes);
writeFileSync(
  "docs/evidence/solana-build.json",
  JSON.stringify(
    {
      compiler: "Solana Playground",
      uuid,
      sourceSha256: createHash("sha256")
        .update(readFileSync("programs/orca-orders/src/lib.rs"))
        .digest("hex"),
      binarySha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    },
    null,
    2,
  ),
);
console.log(
  `Compiled ${bytes.length} bytes. Compiler service: Solana Playground.`,
);
