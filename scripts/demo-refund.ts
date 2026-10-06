import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Keypair, Transaction } from "@solana/web3.js";
import { config } from "../apps/api/src/config.ts";
import {
  connection,
  fundingTransaction,
  refundTransaction,
  observeEscrow,
} from "../apps/api/src/solana.ts";
import { hash, type Order } from "../packages/core/src/domain.ts";

if (
  config.mode !== "live" ||
  (await connection.getGenesisHash()) !==
    "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw new Error("LIVE_DEVNET_ONLY");
const original: Order = JSON.parse(
  readFileSync("docs/evidence/live-order-recovered.json", "utf8"),
).order;
const buyer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(readFileSync(config.dataDir + "/demo-buyer.json", "utf8")),
  ),
);
const order: Order = {
  id: randomUUID(),
  mode: "live",
  status: "created",
  createdAt: Date.now(),
  deadline: Date.now() + 90000,
  input: original.input,
  inputHash: hash({
    solanaWallet: original.input.solanaWallet,
    cardanoWallet: original.input.cardanoWallet,
  }),
  buyer: buyer.publicKey.toBase58(),
  worker: original.worker,
  seller: original.seller,
  sellerKey: original.sellerKey,
  reward: "10000000",
  ceiling: "2000000",
  feeCeiling: "1000000",
};
async function send(
  unsigned: Pick<
    Awaited<ReturnType<typeof fundingTransaction>>,
    "transaction" | "lastValidBlockHeight"
  >,
) {
  const tx = Transaction.from(Buffer.from(unsigned.transaction, "base64"));
  tx.sign(buyer);
  const signature = await connection.sendRawTransaction(tx.serialize());
  const result = await connection.confirmTransaction(
    {
      signature,
      blockhash: tx.recentBlockhash!,
      lastValidBlockHeight: unsigned.lastValidBlockHeight,
    },
    "confirmed",
  );
  if (result.value.err) throw new Error("TRANSACTION_FAILED");
  return signature;
}
const funding = await fundingTransaction(order);
const fundingTx = await send(funding);
const reserved = await observeEscrow(order);
if (reserved.status !== 0) throw new Error("UNEXPECTED_ESCROW_STATE");
console.log(
  `Actual Devnet expiry probe funded: ${fundingTx}; waiting for the 90-second chain deadline.`,
);
while (Date.now() <= order.deadline + 2000)
  await new Promise((resolve) => setTimeout(resolve, 1000));
const before = await connection.getBalance(buyer.publicKey, "confirmed");
const refundTx = await send(await refundTransaction(order));
const state = await observeEscrow(order);
const after = await connection.getBalance(buyer.publicKey, "confirmed");
const transaction = await connection.getTransaction(refundTx, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
});
if (
  state.status !== 3 ||
  !transaction?.meta ||
  transaction.meta.err ||
  after - before + transaction.meta.fee !== Number(order.reward)
)
  throw new Error("REFUND_PROOF_MISMATCH");
writeFileSync(
  "docs/evidence/live-refund.json",
  JSON.stringify(
    {
      scope:
        "Direct program expiry probe; 90-second deadline. The product UI retains its 15-minute deadline. No Cardano purchase or CRE settlement.",
      network: "solana:devnet",
      programId: config.program,
      orderId: order.id,
      pda: funding.pda,
      deadline: order.deadline,
      rewardLamports: order.reward,
      fundingTx,
      refundTx,
      refundFeeLamports: transaction.meta.fee,
      buyerBalanceBefore: before,
      buyerBalanceAfter: after,
      escrowState: state.status,
      confirmed: true,
      recordedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(
  "Confirmed actual expiry refund; reward transfer checked against buyer balance and transaction fee.",
);
