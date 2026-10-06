import {
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../apps/api/src/config.ts";
import { connection, loadWallet } from "../apps/api/src/solana.ts";

if (
  (await connection.getGenesisHash()) !==
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw new Error("DEVNET_ONLY: refusing to fund on any other cluster");
const authority = loadWallet("authority");
const buyer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      readFileSync(resolve(config.dataDir, "demo-buyer.json"), "utf8"),
    ),
  ),
);
const wallets = [
  { name: "worker", key: loadWallet("worker").publicKey, target: 50000000 },
  { name: "demo-buyer", key: buyer.publicKey, target: 100000000 },
];
const accounts = await connection.getMultipleAccountsInfo(
  wallets.map((w) => w.key),
);
const needed = wallets
  .map((w, i) => ({
    ...w,
    amount: Math.max(0, w.target - (accounts[i]?.lamports ?? 0)),
  }))
  .filter((w) => w.amount > 0);
if (!needed.length) {
  console.log("Test wallets are already funded.");
} else {
  const total = needed.reduce((n, w) => n + w.amount, 0);
  if ((await connection.getBalance(authority.publicKey)) < total + 1000000000)
    throw new Error(
      "DEVNET_FUNDING_REQUIRED: request 2 Devnet SOL to the authority; preserve 1 SOL for deployment",
    );
  const tx = new Transaction().add(
    ...needed.map((w) =>
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: w.key,
        lamports: w.amount,
      }),
    ),
  );
  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [authority],
    { commitment: "confirmed" },
  );
  console.log(
    `Funded generated Devnet worker and buyer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  );
}
