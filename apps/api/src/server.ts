import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { bech32 } from "@scure/base";
import { z } from "zod";
import {
  inputSchema,
  hash,
  transition,
  type Order,
} from "../../../packages/core/src/domain.ts";
import { config, readiness, sellerPublicKey } from "./config.ts";
import { Store } from "./store.ts";
import { startWorker } from "./worker.ts";
import {
  fundingTransaction,
  observeEscrow,
  observeFunding,
  refundTransaction,
  workerAddress,
} from "./solana.ts";
import { mountPaidResource } from "./cardano.ts";
import { Challenges } from "./challenges.ts";

export const store = new Store(resolve(config.dataDir, "orders.sqlite"));
const challenges = new Challenges(store);
export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
const requests = new Map<string, { count: number; expires: number }>();
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  const origin = req.headers.origin;
  if (
    origin &&
    (origin === config.apiUrl ||
      process.env.CORS_ORIGIN?.split(",").includes(origin))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  if (req.method === "POST") {
    const key = req.ip ?? "local";
    let bucket = requests.get(key);
    if (!bucket || bucket.expires < Date.now()) {
      bucket = { count: 0, expires: Date.now() + 60000 };
      requests.set(key, bucket);
    }
    if (++bucket.count > 20) {
      res.status(429).json({ error: "RATE_LIMITED" });
      return;
    }
  }
  next();
});
app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    mode: config.mode,
    integrations: readiness(),
    version: "0.1.0",
    programId: config.program || null,
    worker: workerAddress() || null,
    sellerKey: sellerPublicKey,
  }),
);
app.get("/api/orders", (_req, res) => res.json(store.list()));
app.post("/api/challenges", (req, res, next) => {
  try {
    res.status(202).json(challenges.create(req.body));
  } catch (error) {
    next(error);
  }
});
app.get("/api/challenges/:id", (req, res, next) => {
  try {
    res.json(challenges.get(String(req.params.id)));
  } catch (error) {
    next(error);
  }
});
app.post("/api/orders", async (req, res, next) => {
  try {
    const body = z
      .object({ input: inputSchema, buyer: z.string().optional() })
      .strict()
      .parse(req.body);
    if (config.mode === "live" && readiness().some((c) => !c.ready))
      return res.status(503).json({
        error: "LIVE_INTEGRATIONS_NOT_READY",
        integrations: readiness(),
      });
    if (
      config.mode === "live" &&
      (!body.buyer || body.input.scenario !== "success")
    )
      throw new Error("LIVE_WALLET_REQUIRED");
    if (body.buyer) new PublicKey(body.buyer);
    if (config.mode === "live") {
      new PublicKey(body.input.solanaWallet);
      const address = bech32.decodeToBytes(body.input.cardanoWallet);
      if (
        address.prefix !== "addr" ||
        ![29, 57].includes(address.bytes.length) ||
        (address.bytes[0] & 15) !== 1
      )
        throw new Error("INVALID_CARDANO_MAINNET_ADDRESS");
    }
    const order: Order = {
      id: randomUUID(),
      mode: config.mode,
      status: "created",
      createdAt: Date.now(),
      deadline: Date.now() + 15 * 60000,
      input: body.input,
      inputHash: hash({
        solanaWallet: body.input.solanaWallet,
        cardanoWallet: body.input.cardanoWallet,
      }),
      reward: "10000000",
      ceiling: "2000000",
      feeCeiling: "1000000",
      buyer: body.buyer ?? "rehearsal-buyer",
      worker: workerAddress() || "rehearsal-worker",
      seller: config.seller || "rehearsal-seller",
      sellerKey: sellerPublicKey,
    };
    store.save(order);
    store.event(order.id, "created", "Immutable task terms created.");
    if (config.mode === "live") {
      const funding = await fundingTransaction(order);
      order.solana = { pda: funding.pda };
      store.save(order);
      res.status(201).json({ order, funding });
    } else res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
});
app.post("/api/orders/:id/start", async (req, res, next) => {
  try {
    let order = store.get(String(req.params.id));
    if (config.mode === "live") {
      const body = z
        .object({
          fundingTx: z.string().min(64).max(100),
          signature: z.string().max(200),
        })
        .strict()
        .parse(req.body);
      const signature = Buffer.from(body.signature, "base64");
      if (
        !nacl.sign.detached.verify(
          Buffer.from(`Start OY order ${order.id}`),
          signature,
          new PublicKey(order.buyer).toBytes(),
        )
      )
        throw new Error("INVALID_BUYER_SIGNATURE");
      await observeFunding(order, body.fundingTx);
      order.solana!.fundingTx = body.fundingTx;
    }
    if (order.status === "created") {
      order = store.save(transition(order, "funded"));
      store.event(
        order.id,
        "funded",
        order.mode === "live"
          ? "Funded Solana Devnet escrow observed."
          : "Rehearsal escrow funded. No assets moved.",
      );
      store.enqueue(order.id);
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});
app.get("/api/orders/:id", async (req, res, next) => {
  try {
    let order = store.get(String(req.params.id));
    if (
      Date.now() >= order.deadline &&
      ["created", "funded", "reserved", "rejected", "blocked"].includes(
        order.status,
      )
    ) {
      order = store.save(transition(order, "expired"));
      store.event(order.id, "expired", "Order deadline passed.");
    }
    res.json(order);
  } catch (e) {
    next(e);
  }
});
app.get("/api/orders/:id/events", (req, res, next) => {
  try {
    store.get(String(req.params.id));
    res.json(store.events(String(req.params.id), Number(req.query.after) || 0));
  } catch (e) {
    next(e);
  }
});
app.get("/api/orders/:id/evidence", (req, res, next) => {
  try {
    const order = store.get(String(req.params.id));
    const path = resolve(config.dataDir, "evidence", `${order.id}-cre.log`);
    res.json({
      order,
      events: store.events(order.id),
      creTranscript: existsSync(path) ? readFileSync(path, "utf8") : null,
      disclosure:
        order.mode === "rehearsal"
          ? "Sample transactions, no sponsor execution, no chain settlement."
          : "CRE local simulation with trusted demo relayer; no DON deployment.",
    });
  } catch (e) {
    next(e);
  }
});
app.post("/api/orders/:id/refund", async (req, res, next) => {
  try {
    let order = store.get(String(req.params.id));
    if (order.status === "settled" || order.status === "refunded")
      throw new Error("REFUND_NOT_AVAILABLE");
    if (Date.now() < order.deadline) throw new Error("REFUND_TOO_EARLY");
    if (order.mode === "live") {
      const state = await observeEscrow(order);
      if (state.status !== 3) throw new Error("CHAIN_REFUND_REQUIRED");
    }
    if (order.status !== "expired")
      order = store.save(transition(order, "expired"));
    order = store.save(transition(order, "refunded"));
    store.event(
      order.id,
      "refunded",
      order.mode === "live"
        ? "Devnet task reward refund observed."
        : "Rehearsal task reward refunded.",
    );
    res.json(order);
  } catch (e) {
    next(e);
  }
});
app.get("/api/orders/:id/refund-transaction", async (req, res, next) => {
  try {
    res.json(await refundTransaction(store.get(String(req.params.id))));
  } catch (e) {
    next(e);
  }
});
mountPaidResource(app, store);
app.get("/paid/report", (_req, res) =>
  res.status(402).json({
    error: "REHEARSAL_RESOURCE",
    message: "Live x402 only runs with a configured funded preprod wallet.",
  }),
);
app.use(express.static(resolve("site/dist")));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message =
    error instanceof z.ZodError
      ? "INVALID_INPUT"
      : error instanceof Error
        ? error.message
        : "INTERNAL_ERROR";
  const status =
    message === "ORDER_NOT_FOUND"
      ? 404
      : message.includes("SIGNATURE")
        ? 403
        : message.startsWith("INVALID")
          ? 400
          : 409;
  res.status(status).json({ error: message });
});
if (process.env.NODE_ENV !== "test") {
  const stop = startWorker(store);
  const stopChallenges = challenges.start();
  const server = app.listen(config.port, process.env.HOST ?? "127.0.0.1", () =>
    console.log(`OY Orders ${config.mode}: ${config.apiUrl}`),
  );
  process.on("SIGTERM", () => {
    stop();
    stopChallenges();
    server.close(() => {
      store.close();
      process.exit(0);
    });
  });
}
