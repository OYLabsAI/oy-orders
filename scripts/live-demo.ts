import { Transaction, Keypair } from "@solana/web3.js";
import { base58 } from "@scure/base";
import nacl from "tweetnacl";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../apps/api/src/config.ts";
import { connection } from "../apps/api/src/solana.ts";

if (
  config.mode !== "live" ||
  (await connection.getGenesisHash()) !==
    "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw new Error("LIVE_DEVNET_ONLY");
const buyer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      readFileSync(resolve(config.dataDir, "demo-buyer.json"), "utf8"),
    ),
  ),
);
const base = `http://localhost:${config.port}`;
async function call(path: string, body?: unknown) {
  const response = await fetch(base + path, {
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `HTTP_${response.status}`);
  return data;
}
const path = resolve(config.dataDir, "live-demo-order.json");
let saved =
  existsSync(path) && !process.argv.includes("--new")
    ? JSON.parse(readFileSync(path, "utf8"))
    : null;
if (!saved) {
  const input = JSON.parse(
    readFileSync(resolve(config.dataDir, "live-inputs.json"), "utf8"),
  );
  saved = await call("/api/orders", {
    input,
    buyer: buyer.publicKey.toBase58(),
  });
  const transaction = Transaction.from(
    Buffer.from(saved.funding.transaction, "base64"),
  );
  transaction.sign(buyer);
  saved.signedFunding = transaction.serialize().toString("base64");
  saved.fundingTx = base58.encode(transaction.signature!);
  writeFileSync(path, JSON.stringify(saved), { mode: 0o600 });
}
let order = await call(`/api/orders/${saved.order.id}`);
if (order.status === "created") {
  const status = (await connection.getSignatureStatuses([saved.fundingTx]))
    .value[0];
  if (!status)
    await connection.sendRawTransaction(
      Buffer.from(saved.signedFunding, "base64"),
    );
  const confirmation = await connection.confirmTransaction(
    {
      signature: saved.fundingTx,
      blockhash: Transaction.from(Buffer.from(saved.signedFunding, "base64"))
        .recentBlockhash!,
      lastValidBlockHeight: saved.funding.lastValidBlockHeight,
    },
    "confirmed",
  );
  if (confirmation.value.err) throw new Error("FUNDING_FAILED");
  order = await call(`/api/orders/${order.id}/start`, {
    fundingTx: saved.fundingTx,
    signature: Buffer.from(
      nacl.sign.detached(
        Buffer.from(`Start Orca order ${order.id}`),
        buyer.secretKey,
      ),
    ).toString("base64"),
  });
}
console.log(`Live order ${order.id}; funding ${saved.fundingTx}`);
let previous = "";
const end = Date.now() + 8 * 60000;
do {
  order = await call(`/api/orders/${order.id}`);
  if (order.status !== previous) {
    console.log(`${order.status}${order.error ? ": " + order.error : ""}`);
    previous = order.status;
  }
  if (
    ["settled", "blocked", "rejected", "expired", "refunded"].includes(
      order.status,
    )
  )
    break;
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000));
} while (Date.now() < end);
writeFileSync(
  "docs/evidence/live-order.json",
  JSON.stringify(await call(`/api/orders/${order.id}/evidence`), null, 2),
);
if (order.status !== "settled")
  throw new Error(`LIVE_ORDER_${order.status.toUpperCase()}`);
console.log(
  "Confirmed paid order and settlement; public evidence saved to docs/evidence/live-order.json",
);
