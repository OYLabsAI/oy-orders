import { readiness, config } from "../apps/api/src/config.ts";
import { connection } from "../apps/api/src/solana.ts";
console.log("Mode:", config.mode);
for (const check of readiness())
  console.log(
    `${check.ready ? "CONFIGURED" : "MISSING"} ${check.name}: ${check.detail}`,
  );
try {
  console.log("Solana Devnet slot:", await connection.getSlot());
} catch {
  console.log("Devnet RPC unavailable");
}
console.log(
  "Configured is not proven. See docs/evidence/STATUS.md for executed evidence.",
);
