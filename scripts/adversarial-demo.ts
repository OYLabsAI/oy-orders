import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair, Transaction } from "@solana/web3.js";
import { base58 } from "@scure/base";
import { config, sellerKey } from "../apps/api/src/config.ts";
import { Store } from "../apps/api/src/store.ts";
import { purchase } from "../apps/api/src/cardano.ts";
import { readFacts } from "../apps/api/src/data.ts";
import { runOrder } from "../apps/api/src/worker.ts";
import {
  connection,
  fundingTransaction,
  refundTransaction,
  reserve,
  observeEscrow,
} from "../apps/api/src/solana.ts";
import {
  hash,
  signReceipt,
  transition,
  type Order,
  type SourceFact,
} from "../packages/core/src/domain.ts";
import { assertSolanaDevnet } from "../packages/core/src/networks.ts";

// Operator-only adversarial probe. No public endpoint can re-sign a report.
// This uses separate test assets and a fresh escrow; previous settled orders
// and their signed evidence are never modified.
if (config.mode !== "live") throw new Error("LIVE_TEST_ASSETS_REQUIRED");
assertSolanaDevnet(await connection.getGenesisHash());
const store = new Store(resolve(config.dataDir, "orders.sqlite"));
const buyer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      readFileSync(resolve(config.dataDir, "demo-buyer.json"), "utf8"),
    ),
  ),
);
const privatePath = resolve(config.dataDir, "adversarial-demo.json");
type Recovery = {
  id: string;
  sourceFacts?: SourceFact[];
  altered?: boolean;
  signed?: Record<
    string,
    {
      transaction: string;
      signature: string;
      blockhash: string;
      lastValidBlockHeight: number;
    }
  >;
  beforeRefund?: number;
};
let recovery: Recovery;
const persist = () =>
  writeFileSync(privatePath, JSON.stringify(recovery), { mode: 0o600 });
if (existsSync(privatePath))
  recovery = JSON.parse(readFileSync(privatePath, "utf8"));
else {
  const original: Order = JSON.parse(
    readFileSync("docs/evidence/live-order.json", "utf8"),
  ).order;
  const order: Order = {
    id: randomUUID(),
    mode: "live",
    status: "created",
    createdAt: Date.now(),
    deadline: Date.now() + 8 * 60000,
    input: original.input,
    inputHash: original.inputHash,
    buyer: buyer.publicKey.toBase58(),
    worker: original.worker,
    seller: original.seller,
    sellerKey: original.sellerKey,
    reward: "10000000",
    ceiling: "2000000",
    feeCeiling: "1000000",
  };
  store.save(order);
  store.event(
    order.id,
    "created",
    "Operator adversarial probe: eight-minute deadline; product tasks retain fifteen minutes.",
  );
  recovery = { id: order.id };
  persist();
}
let order = store.get(recovery.id);
const move = (status: Order["status"], detail: string) => {
  order = store.save(transition(order, status));
  store.event(order.id, status, detail);
};
async function send(
  stage: string,
  unsigned: Pick<
    Awaited<ReturnType<typeof fundingTransaction>>,
    "transaction" | "lastValidBlockHeight"
  >,
) {
  recovery.signed ??= {};
  let saved = recovery.signed[stage];
  if (!saved) {
    const transaction = Transaction.from(
      Buffer.from(unsigned.transaction, "base64"),
    );
    transaction.sign(buyer);
    saved = recovery.signed[stage] = {
      transaction: transaction.serialize().toString("base64"),
      signature: base58.encode(transaction.signature!),
      blockhash: transaction.recentBlockhash!,
      lastValidBlockHeight: unsigned.lastValidBlockHeight,
    };
    persist();
  }
  const observed = (await connection.getSignatureStatuses([saved.signature]))
    .value[0];
  if (!observed)
    await connection.sendRawTransaction(
      Buffer.from(saved.transaction, "base64"),
    );
  const confirmation = await connection.confirmTransaction(
    {
      signature: saved.signature,
      blockhash: saved.blockhash,
      lastValidBlockHeight: saved.lastValidBlockHeight,
    },
    "confirmed",
  );
  if (confirmation.value.err) throw new Error("PROBE_TRANSACTION_FAILED");
  return saved.signature;
}
if (order.status === "created") {
  const funding = await fundingTransaction(order);
  order.solana = { pda: funding.pda };
  store.save(order);
  order.solana.fundingTx = await send("funding", funding);
  store.save(order);
  move(
    "funded",
    "Actual Devnet reward funded; it cannot be paid out without successful verification.",
  );
}
if (order.status === "funded") {
  order.quote ??= {
    orderId: order.id,
    network: "cardano:preprod",
    asset: "lovelace",
    amount: "2000000",
    recipient: order.seller,
    expiresAt: order.deadline,
    resource: `${config.apiUrl}/paid/report?orderId=${order.id}`,
  };
  order.quoteHash = hash(order.quote);
  store.save(order);
  const escrow = await observeEscrow(order);
  if (escrow.status === 0) order.solana!.reserveTx = await reserve(order);
  else if (escrow.status !== 1 || escrow.quoteHash !== order.quoteHash)
    throw new Error("PROBE_RESERVATION_MISMATCH");
  store.save(order);
  move(
    "reserved",
    "Actual 2 tADA quote reserved under immutable escrow terms.",
  );
}
if (order.status === "reserved")
  move(
    "purchasing",
    "Actual HTTP 402 purchase; signed Cardano payload is persisted before broadcast.",
  );
if (order.status === "purchasing") {
  order.report ??= {
    inputHash: order.inputHash,
    solanaWallet: order.input.solanaWallet,
    cardanoWallet: order.input.cardanoWallet,
    facts: await readFacts(order),
  };
  store.save(order);
  order.payment ??= await purchase(order);
  store.claimPayment(order.payment.tx, order.id);
  store.save(order);
  if (!order.report.facts.length) throw new Error("PROBE_REQUIRES_REAL_FACTS");
  recovery.sourceFacts ??= structuredClone(order.report.facts);
  persist();
  // Model a dishonest supplier: sign a wrong answer, with a matching report
  // digest. Signature and integrity must pass; provenance must fail.
  if (!recovery.altered) {
    order.report.facts[0].fee = (
      BigInt(recovery.sourceFacts[0].fee) * 1000n +
      1n
    ).toString();
    order.receipt = signReceipt(
      {
        orderId: order.id,
        quoteHash: order.quoteHash!,
        paymentHash: order.payment.tx,
        recipient: order.seller,
        network: "cardano:preprod",
        asset: "lovelace",
        amount: order.quote!.amount,
        resultHash: hash(order.report),
      },
      sellerKey,
    );
    store.save(order);
    recovery.altered = true;
    persist();
  }
  move(
    "paid",
    "Actual supplier payment confirmed. Controlled adversarial supplier signed an inflated fee claim.",
  );
}
if (["paid", "verifying"].includes(order.status)) {
  await runOrder(store, order.id, true);
  order = store.get(order.id);
}
const checks = order.verification?.checks ?? [];
if (
  !order.verification ||
  order.verification.accepted ||
  !["rejected", "expired", "refunded"].includes(order.status) ||
  !checks.find((c) => c.name === "Seller signature")?.passed ||
  !checks.find((c) => c.name === "Result integrity")?.passed ||
  checks.find((c) => c.name === "Source provenance")?.passed ||
  order.solana?.settleTx
)
  throw new Error("ADVERSARIAL_PROOF_NOT_ESTABLISHED");
const held = await observeEscrow(order);
const proofPath = "docs/evidence/live-adversarial.json";
const proof: any = existsSync(proofPath)
  ? JSON.parse(readFileSync(proofPath, "utf8"))
  : {
      scope:
        "Controlled dishonest-supplier test: a fresh real purchase, signed false report, official CRE rejection, reserved reward and subsequent expiry refund. Eight-minute probe deadline; product tasks retain fifteen minutes. Cardano supplier payment is final.",
      order: structuredClone(order),
      events: store.events(order.id),
      sourceFacts: recovery.sourceFacts,
      creTranscript: readFileSync(
        resolve(config.dataDir, "evidence", `${order.id}-cre.log`),
        "utf8",
      ),
      protectedReward: {
        rewardLamports: order.reward,
        escrowState: held.status,
        observedAt: new Date().toISOString(),
        settlementSubmitted: false,
      },
    };
if (!proof.refund && held.status !== 1) throw new Error("REWARD_NOT_RESERVED");
writeFileSync(proofPath, JSON.stringify(proof, null, 2));
console.log(
  `Signed false answer rejected by official CRE: ${order.id}; signature and integrity passed; provenance failed. Reward remains reserved.`,
);
if (!proof.refund) {
  console.log(
    "Waiting for the original eight-minute chain deadline; no further purchase will be made.",
  );
  while (Date.now() <= order.deadline + 2000)
    await new Promise((r) => setTimeout(r, 1000));
  recovery.beforeRefund ??= await connection.getBalance(
    buyer.publicKey,
    "confirmed",
  );
  persist();
  const refundTx = await send("refund", await refundTransaction(order));
  const escrow = await observeEscrow(order);
  const after = await connection.getBalance(buyer.publicKey, "confirmed");
  const transaction = await connection.getTransaction(refundTx, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (
    escrow.status !== 3 ||
    !transaction?.meta ||
    transaction.meta.err ||
    after - recovery.beforeRefund + transaction.meta.fee !==
      Number(order.reward)
  )
    throw new Error("ADVERSARIAL_REFUND_MISMATCH");
  order.solana!.refundTx = refundTx;
  store.save(order);
  order = store.get(order.id);
  if (order.status === "rejected")
    move(
      "expired",
      "The original chain deadline passed; supplier payment remains final.",
    );
  if (order.status === "expired")
    move(
      "refunded",
      "The protected 0.01 tSOL task reward returned to the buyer after the false signed answer was rejected.",
    );
  proof.refund = {
    refundTx,
    rewardLamports: order.reward,
    feeLamports: transaction.meta.fee,
    buyerBalanceBefore: recovery.beforeRefund,
    buyerBalanceAfter: after,
    escrowState: escrow.status,
    confirmed: true,
    recordedAt: new Date().toISOString(),
  };
  proof.finalOrder = order;
  proof.events = store.events(order.id);
  writeFileSync(proofPath, JSON.stringify(proof, null, 2));
}
store.close();
console.log(
  "Proof before payday: genuine rejection, protected reward, and confirmed reward refund saved.",
);
