import { writeFileSync, mkdirSync } from "node:fs";
const base = process.env.PUBLIC_API_URL ?? "http://localhost:8787";
const orders = await (await fetch(base + "/api/orders")).json();
mkdirSync("docs/evidence", { recursive: true });
for (const order of orders) {
  const evidence = await (
    await fetch(`${base}/api/orders/${order.id}/evidence`)
  ).json();
  writeFileSync(
    `docs/evidence/${order.mode}-${order.id}.json`,
    JSON.stringify(evidence, null, 2),
  );
}
console.log(
  `Exported ${orders.length} orders; filenames disclose execution mode.`,
);
