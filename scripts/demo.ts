import { writeFileSync, mkdirSync } from "node:fs";
const base = process.env.PUBLIC_API_URL ?? "http://localhost:8787";
async function call(path: string, body?: unknown) {
  const r = await fetch(base + path, {
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const b = await r.json();
  if (!r.ok) throw new Error(b.error);
  return b;
}
mkdirSync("docs/evidence", { recursive: true });
for (const scenario of ["success", "tampered", "expiry"]) {
  const { order } = await call("/api/orders", {
    input: {
      solanaWallet: "Vote111111111111111111111111111111111111111",
      cardanoWallet: "addr1q" + "a".repeat(97),
      scenario,
    },
  });
  await call(`/api/orders/${order.id}/start`, {});
  let latest;
  do {
    await new Promise((r) => setTimeout(r, 700));
    latest = await call(`/api/orders/${order.id}`);
  } while (
    !["settled", "rejected", "expired", "blocked"].includes(latest.status)
  );
  if (scenario === "expiry")
    latest = await call(`/api/orders/${order.id}/refund`, {});
  const evidence = await call(`/api/orders/${order.id}/evidence`);
  writeFileSync(
    `docs/evidence/rehearsal-${scenario}.json`,
    JSON.stringify(evidence, null, 2),
  );
  console.log(scenario, latest.status, order.id);
}
