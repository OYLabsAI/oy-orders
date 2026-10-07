import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Transaction } from "@solana/web3.js";
import { base58 } from "@scure/base";
import { z } from "zod";
import type { Express } from "express";
import {
  hash,
  transition,
  verifySignature,
  type Order,
} from "../../../packages/core/src/domain.ts";
import {
  COFFEE_PASS,
  taskInput,
  passMatchesTask,
} from "../../../packages/core/src/retail.ts";
import { config, sellerPublicKey, readiness } from "./config.ts";
import {
  connection,
  fundingTransaction,
  loadWallet,
  observeFunding,
  observeEscrow,
  workerAddress,
} from "./solana.ts";
import { PassLedger, credentialHash } from "./pass-ledger.ts";
import type { Store } from "./store.ts";
import { shoppingPlan } from "./shopping-offers.ts";
import { shoppingCommitment } from "../../../packages/core/src/shopping.ts";
import { assertSolanaDevnet } from "../../../packages/core/src/networks.ts";

const key = z.string().regex(/^[a-f0-9]{64}$/);
const budget = z.enum(["1000000", "2000000", "3000000"]);
const planInput = z.object({ sku: z.literal("coffee-pass"), budget }).strict();
const checkoutInput = z
  .object({
    idempotencyKey: z.string().uuid(),
    accessKey: key,
    sku: z.literal("coffee-pass"),
    budget: budget.default("2000000"),
  })
  .strict();
const statusInput = z
  .object({ checkoutId: z.string().uuid(), accessKey: key })
  .strict();
const passInput = z.object({ orderId: z.string().uuid(), token: key }).strict();

export class Shop {
  readonly ledger;
  private secret: Buffer;
  constructor(private store: Store) {
    this.ledger = new PassLedger(store);
    const file = resolve(config.dataDir, "shop-pass.key");
    if (!existsSync(file))
      writeFileSync(file, randomBytes(32), { mode: 0o600 });
    this.secret = readFileSync(file);
    if (this.secret.length !== 32) throw Error("INVALID_PASS_KEY");
  }
  private token(orderId: string) {
    return createHmac("sha256", this.secret)
      .update(`OY_DEMO_PASS_V1:${orderId}`)
      .digest("hex");
  }
  plan(raw: unknown) {
    const input = planInput.parse(raw);
    const now = Date.now();
    return {
      ...shoppingPlan(
        {
          id: randomUUID(),
          seller: config.seller,
          ceiling: input.budget,
          deadline: now + 15 * 60000,
        },
        now,
      ),
      disclosure:
        "Comparison only. No coins spent. Four OY-operated test offers; no independent merchants or AI model claimed.",
    };
  }
  async create(raw: unknown) {
    const input = checkoutInput.parse(raw);
    const existing = this.ledger.find(input.idempotencyKey);
    if (existing) {
      const row = this.ledger.owned(existing.id, input.accessKey);
      if (this.store.get(row.order_id).ceiling !== input.budget)
        throw Error("SHOP_INTENT_CHANGED");
      return this.describe(row);
    }
    if (config.mode !== "live" || readiness().some((i) => !i.ready))
      throw Error("SHOP_LIVE_SETUP_REQUIRED");
    // This public demo spends operator-owned TEST coins. Its persistent global
    // limit defaults to five purchases per rolling day. An operator can set
    // at most ten; transaction fees and escrow rent remain separate.
    const id = randomUUID();
    const now = Date.now();
    const deadline = now + 15 * 60000;
    const shopping = shoppingPlan(
      { id, seller: config.seller, ceiling: input.budget, deadline },
      now,
    );
    // An unfulfillable budget creates no escrow, order, job or Cardano payment.
    if (shopping.selected === null) throw Error("SHOP_NO_MATCH");
    const buyer = loadWallet("demo-buyer");
    assertSolanaDevnet(await connection.getGenesisHash());
    const [balance, rent] = await Promise.all([
      connection.getBalance(buyer.publicKey),
      connection.getMinimumBalanceForRentExemption(328),
    ]);
    if (balance < Number(COFFEE_PASS.reward) + rent + 10000)
      throw Error("SHOP_DEMO_WALLET_EMPTY");
    const reference = this.store.get("8456603d-6318-4a72-a403-af2c992cc84a");
    const orderInput = {
      solanaWallet: reference.input.solanaWallet,
      cardanoWallet: reference.input.cardanoWallet,
      scenario: "success" as const,
      retail: {
        sku: COFFEE_PASS.sku,
        commitment: credentialHash(this.token(id)),
        shoppingHash: shoppingCommitment(shopping),
      },
    };
    const order: Order = {
      id,
      mode: "live",
      status: "created",
      createdAt: now,
      deadline,
      input: orderInput,
      inputHash: hash(taskInput(orderInput)),
      reward: COFFEE_PASS.reward,
      ceiling: input.budget,
      feeCeiling: "1000000",
      buyer: buyer.publicKey.toBase58(),
      worker: workerAddress(),
      seller: config.seller,
      sellerKey: sellerPublicKey,
      shopping,
    };
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      // Recheck inside the transaction after asynchronous RPC calls so two
      // simultaneous callers cannot bypass the single-checkout or daily cap.
      if (this.ledger.active()) throw Error("SHOP_CHECKOUT_BUSY");
      if (this.ledger.countSince(Date.now() - 86400000) >= config.shopDailyLimit)
        throw Error("SHOP_DEMO_LIMIT");
      this.store.save(order);
      this.ledger.insert(
        input.idempotencyKey,
        id,
        input.accessKey,
        this.token(id),
        order.createdAt,
      );
      this.store.event(
        id,
        "created",
        "Coffee demo pass ordered. One-use pass commitment bound before payment.",
      );
      this.store.db.exec("COMMIT");
    } catch (error) {
      this.store.db.exec("ROLLBACK");
      throw error;
    }
    return this.describe(
      this.ledger.owned(input.idempotencyKey, input.accessKey),
    );
  }
  private valid(order: Order) {
    return (
      order.status === "settled" &&
      order.verification?.accepted &&
      !!order.report &&
      !!order.receipt &&
      !!order.payment?.confirmed &&
      passMatchesTask(order.input, order.report) &&
      hash(taskInput(order.input)) === order.inputHash &&
      hash(order.report) === order.receipt.resultHash &&
      verifySignature(order.receipt, order.sellerKey)
    );
  }
  private describe(row: import("./pass-ledger.ts").PassRow) {
    const order = this.store.get(row.order_id);
    return {
      checkoutId: row.id,
      orderId: order.id,
      product: COFFEE_PASS,
      status: order.status,
      createdAt: order.createdAt,
      deadline: order.deadline,
      usedAt: row.used_at,
      ...(this.valid(order) ? { token: this.token(order.id) } : {}),
      proof: {
        fundingTx: order.solana?.fundingTx,
        cardanoTx: order.payment?.tx,
        settleTx: order.solana?.settleTx,
        resultHash: order.receipt?.resultHash,
      },
      shopping: order.shopping,
      verification: order.verification,
      ...(order.error
        ? {
            error:
              "The checkout paused before delivery. No ready-to-use pass was issued.",
          }
        : {}),
      disclosure:
        "Operator-funded test coins. Demo voucher only; no real coffee or admission. The Cardano supplier payment is separate and final. Pass use is recorded in OY’s persistent server ledger, not on chain.",
    };
  }
  status(raw: unknown) {
    const input = statusInput.parse(raw);
    return this.describe(this.ledger.owned(input.checkoutId, input.accessKey));
  }
  pass(raw: unknown) {
    const input = passInput.parse(raw);
    const row = this.ledger.byToken(input.orderId, input.token);
    if (!this.valid(this.store.get(row.order_id)))
      throw Error("PASS_NOT_READY");
    return this.describe(row);
  }
  async redeem(raw: unknown) {
    const input = passInput.parse(raw);
    const row = this.ledger.byToken(input.orderId, input.token);
    const order = this.store.get(row.order_id);
    if (!this.valid(order)) throw Error("PASS_NOT_READY");
    const escrow = await observeEscrow(order);
    if (escrow.status !== 2 || escrow.resultHash !== order.receipt!.resultHash)
      throw Error("PASS_CHAIN_PROOF_MISMATCH");
    const accepted = this.ledger.redeem(order.id, input.token, Date.now());
    if (accepted)
      this.store.event(
        order.id,
        "pass-used",
        "Demo coffee pass redeemed once. Conditional persistent ledger write accepted.",
      );
    const current = this.ledger.byToken(order.id, input.token);
    return {
      accepted,
      usedAt: current.used_at,
      orderId: order.id,
      reason: accepted ? "PASS_ACCEPTED" : "ALREADY_USED",
    };
  }
  private async fund(id: string) {
    let order = this.store.get(id);
    const file = resolve(config.dataDir, `shop-funding-${id}.json`);
    let saved: {
      transaction: string;
      signature: string;
      lastValidBlockHeight: number;
      pda: string;
    };
    if (existsSync(file)) saved = JSON.parse(readFileSync(file, "utf8"));
    else {
      const funding = await fundingTransaction(order);
      const tx = Transaction.from(Buffer.from(funding.transaction, "base64"));
      tx.sign(loadWallet("demo-buyer"));
      saved = {
        transaction: tx.serialize().toString("base64"),
        signature: base58.encode(tx.signature!),
        lastValidBlockHeight: funding.lastValidBlockHeight,
        pda: funding.pda,
      };
      writeFileSync(file, JSON.stringify(saved), { mode: 0o600 });
    }
    const tx = Transaction.from(Buffer.from(saved.transaction, "base64"));
    const status = (await connection.getSignatureStatuses([saved.signature]))
      .value[0];
    if (!status)
      await connection.sendRawTransaction(
        Buffer.from(saved.transaction, "base64"),
        { skipPreflight: false },
      );
    const confirmation = await connection.confirmTransaction(
      {
        signature: saved.signature,
        blockhash: tx.recentBlockhash!,
        lastValidBlockHeight: saved.lastValidBlockHeight,
      },
      "confirmed",
    );
    if (confirmation.value.err) throw Error("SHOP_FUNDING_FAILED");
    await observeFunding(order, saved.signature);
    order.solana = { pda: saved.pda, fundingTx: saved.signature };
    order = this.store.save(transition(order, "funded"));
    this.store.event(
      id,
      "funded",
      "Demo buyer’s 0.01 tSOL locked for the committed coffee pass. Cardano supplier purchase is funded separately by the operator worker.",
    );
    this.store.enqueue(id);
  }
  start() {
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      const pending = this.ledger.pending();
      if (!pending) return;
      busy = true;
      try {
        await this.fund(pending.order_id);
      } catch {
        const order = this.store.get(pending.order_id);
        if (order.status === "created") {
          order.error = "SHOP_FUNDING_PAUSED";
          this.store.save(transition(order, "blocked"));
          this.store.event(
            order.id,
            "blocked",
            "Funding paused. Saved signed transaction retained; no replacement payment constructed.",
          );
        }
      } finally {
        busy = false;
      }
    }, 400);
    return () => clearInterval(timer);
  }
}

export function mountShop(app: Express, store: Store) {
  const shop = new Shop(store);
  app.post("/api/shop/plan", (req, res, next) => {
    try {
      res.json(shop.plan(req.body));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/shop/checkout", async (req, res, next) => {
    try {
      res.status(202).json(await shop.create(req.body));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/shop/status", (req, res, next) => {
    try {
      res.json(shop.status(req.body));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/shop/pass", (req, res, next) => {
    try {
      res.json(shop.pass(req.body));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/shop/redeem", async (req, res, next) => {
    try {
      res.json(await shop.redeem(req.body));
    } catch (e) {
      next(e);
    }
  });
  return shop;
}
