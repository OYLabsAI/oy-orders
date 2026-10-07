import { createHash } from "node:crypto";
import { executeCre } from "./cre-runner.ts";
import {
  hash,
  signReceipt,
  transition,
  verifyEvidence,
  assertQuote,
  type Order,
  type SourceFact,
  type Verification,
} from "../../../packages/core/src/domain.ts";
import { config, sellerKey } from "./config.ts";
import { Store } from "./store.ts";
import { readFacts, observePayment } from "./data.ts";
import { purchase } from "./cardano.ts";
import { parseCreOutput } from "./cre-output.ts";
import { reserve, settle, observeEscrow, loadWallet } from "./solana.ts";
import {
  chooseOffers,
  shoppingCommitment,
} from "../../../packages/core/src/shopping.ts";
import { verifySignature } from "../../../packages/core/src/domain.ts";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
export function rehearsalFacts(order: Order): SourceFact[] {
  return (["solana:mainnet", "cardano:mainnet"] as const).flatMap(
    (network, i) =>
      Array.from({ length: 3 }, (_, n) => ({
        network,
        wallet: i === 0 ? order.input.solanaWallet : order.input.cardanoWallet,
        tx: createHash("sha256")
          .update(`${order.id}:${network}:${n}`)
          .digest("hex"),
        slot: String(380000000 + n + i * 20000),
        fee: String(i === 0 ? 5000 : 171000),
        confirmed: true,
      })),
  );
}
async function simulate(order: Order): Promise<Verification> {
  const { output } = await executeCre(order.id, {
    orderId: order.id,
    apiUrl: config.apiUrl,
    solanaRpc: config.solanaRpc,
    programId: config.program,
    sellerKey: order.sellerKey,
    worker: order.worker,
    authority: loadWallet("authority").publicKey.toBase58(),
    blockfrostKey: config.blockfrostKey,
    paymentProvider: config.cardanoPaymentProvider,
    nownodesKey: config.nownodesKey,
  });
  const result = parseCreOutput(
    output,
    order.receipt!.resultHash,
    order.shopping ? 11 : 10,
  );
  return { ...result, transcript: `/api/orders/${order.id}/evidence` };
}
export async function runOrder(store: Store, id: string, fast = false) {
  let order = store.get(id);
  const update = (status: Order["status"], detail: string) => {
    order = store.save(transition(order, status));
    store.event(id, status, detail);
  };
  const pause = () => delay(fast ? 0 : 650);
  try {
    if (order.deadline <= Date.now()) {
      if (!["expired", "refunded", "settled"].includes(order.status))
        update("expired", "Deadline passed. Task escrow can be refunded.");
      return;
    }
    if (order.status === "funded") {
      if (order.shopping) {
        const plan = order.shopping;
        if (
          plan.budget !== order.ceiling ||
          shoppingCommitment(plan) !== order.input.retail?.shoppingHash
        )
          throw Error("SHOPPING_COMMITMENT_MISMATCH");
        const decision = chooseOffers(
          { ...order, resource: `${config.apiUrl}/paid/report?orderId=${id}` },
          plan.offers,
          verifySignature,
          Date.now(),
        );
        if (
          decision.selected === null ||
          decision.selected !== plan.selected ||
          hash(decision.decisions) !== hash(plan.decisions)
        )
          throw Error("SHOPPING_SELECTION_MISMATCH");
        order.quote = plan.offers[decision.selected].quote;
        for (const [index, offer] of plan.offers.entries())
          store.event(
            id,
            "offer-reviewed",
            `${offer.label}: ${decision.decisions[index].reason}.`,
          );
      } else
        order.quote = {
          orderId: id,
          network: "cardano:preprod",
          asset: "lovelace",
          amount: "2000000",
          recipient: order.seller,
          expiresAt: order.deadline,
          resource: `${config.apiUrl}/paid/report?orderId=${id}`,
        };
      assertQuote(order, order.quote);
      order.quoteHash = hash(order.quote);
      store.save(order);
      if (order.mode === "live") {
        const state = await observeEscrow(order);
        if (state.status === 0) {
          order.solana!.reserveTx = await reserve(order);
        } else if (state.status !== 1 || state.quoteHash !== order.quoteHash)
          throw new Error("RESERVATION_MISMATCH");
      }
      update(
        "reserved",
        "Seller and 2 tADA quote reserved within the spending ceiling.",
      );
      await pause();
    }
    if (order.status === "reserved") {
      update(
        "purchasing",
        order.mode === "live"
          ? "Agent handles the Cardano x402 payment challenge."
          : "Rehearsal: simulating HTTP 402 and test payment. No transaction is sent.",
      );
      await pause();
    }
    if (order.status === "purchasing") {
      if (order.input.scenario === "expiry" && order.mode === "rehearsal") {
        order.deadline = Date.now() - 1;
        store.save(order);
        update(
          "expired",
          "Rehearsal clock advanced past the deadline before purchase.",
        );
        return;
      }
      order.report ??= {
        inputHash: order.inputHash,
        solanaWallet: order.input.solanaWallet,
        cardanoWallet: order.input.cardanoWallet,
        facts: order.input.retail
          ? []
          : order.mode === "live"
            ? await readFacts(order)
            : rehearsalFacts(order),
        ...(order.input.retail ? { retail: { ...order.input.retail } } : {}),
      };
      store.save(order);
      order.payment ??=
        order.mode === "live"
          ? await purchase(order)
          : {
              tx: hash({ id, kind: "rehearsal-payment" }),
              recipient: order.seller,
              amount: "2000000",
              network: "cardano:preprod",
              asset: "lovelace",
              fee: "171000",
              confirmed: true,
            };
      store.claimPayment(order.payment.tx, id);
      store.save(order);
      order.receipt ??= signReceipt(
        {
          orderId: id,
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
      if (order.input.scenario === "tampered" && order.mode === "rehearsal")
        order.report.facts[0].fee = "999999";
      store.save(order);
      update(
        "paid",
        order.mode === "live"
          ? "Confirmed preprod payment; seller receipt signed."
          : "Rehearsal payment recorded with a real local seller signature.",
      );
      await pause();
    }
    if (order.status === "paid") {
      update(
        "verifying",
        order.mode === "live"
          ? "CRE simulation rechecks escrow, payment, receipt and chain facts."
          : "Rehearsal verifier checks quote, signed receipt and sample facts.",
      );
      await pause();
    }
    if (order.status === "verifying") {
      order.verification ??=
        order.mode === "live"
          ? await simulate(order)
          : verifyEvidence(order, order.payment!, rehearsalFacts(order));
      store.save(order);
      if (!order.verification.accepted) {
        update(
          "rejected",
          `Verification rejected: ${order.verification.reason}. Task reward remains in escrow.`,
        );
        return;
      }
      if (order.mode === "live") {
        const state = await observeEscrow(order);
        if (state.status === 1 && state.quoteHash === order.quoteHash)
          order.solana!.settleTx = await settle(order);
        else if (
          state.status !== 2 ||
          state.resultHash !== order.receipt!.resultHash
        )
          throw new Error("SETTLEMENT_STATE_MISMATCH");
      }
      update(
        "settled",
        order.mode === "live"
          ? "Verified task reward released on Solana Devnet."
          : "Rehearsal complete. The simulated task reward is released.",
      );
    }
  } catch (error) {
    order = store.get(id);
    order.error = error instanceof Error ? error.message : "WORKER_FAILED";
    store.save(order);
    if (
      !["settled", "refunded", "rejected", "expired", "blocked"].includes(
        order.status,
      )
    )
      update(
        "blocked",
        `Execution paused: ${order.error}. No unverified settlement.`,
      );
  } finally {
    store.finish(id);
  }
}
export function startWorker(store: Store) {
  for (const order of store.list())
    if (
      ["funded", "reserved", "purchasing", "paid", "verifying"].includes(
        order.status,
      )
    )
      store.enqueue(order.id);
  store.recover();
  let active = false;
  const timer = setInterval(async () => {
    if (active) return;
    const id = store.next();
    if (!id) return;
    active = true;
    try {
      await runOrder(store, id);
    } finally {
      active = false;
    }
  }, 400);
  return () => clearInterval(timer);
}
