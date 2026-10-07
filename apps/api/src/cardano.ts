// Adapted from Cardano Foundation's x402 Express starter (MIT), pinned SDK 2.26.
import { x402Client, x402HTTPClient } from "@x402/fetch";
import {
  toClientCardanoSigner,
  decodeCardanoTransaction,
  ASSET_TRANSFER_METHOD_DEFAULT,
} from "@x402/cardano";
import { ExactCardanoScheme as ClientScheme } from "@x402/cardano/exact/client";
import { ExactCardanoScheme as ServerScheme } from "@x402/cardano/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { assertQuote, type Order } from "../../../packages/core/src/domain.ts";
import { config } from "./config.ts";
import { observePayment } from "./data.ts";
import { KOIOS_PREPROD } from "../../../packages/core/src/cardano-payment.ts";
import type { Store } from "./store.ts";

export function mountPaidResource(app: Express, store: Store) {
  if (config.mode !== "live" || !config.seller) return;
  const resource = new x402ResourceServer(
    new HTTPFacilitatorClient({
      url:
        process.env.FACILITATOR_URL ??
        "https://x402.preprod.dev.ecosyseng.cf-deployments.org",
    }),
  ).register("cardano:preprod", new ServerScheme());
  app.use("/paid/report", (req, res, next) => {
    try {
      const order = store.get(String(req.query.orderId));
      if (
        !["purchasing", "paid"].includes(order.status) ||
        order.deadline <= Date.now()
      )
        return res.status(409).json({ error: "ORDER_NOT_PURCHASABLE" });
      next();
    } catch {
      res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }
  });
  app.use(
    paymentMiddleware(
      {
        "GET /paid/report": {
          accepts: [
            {
              scheme: "exact",
              network: "cardano:preprod",
              price: { amount: "2000000", asset: "lovelace" },
              payTo: config.seller,
            },
          ],
          description:
            "Verified wallet report or one-use digital demo coffee pass",
          mimeType: "application/json",
        },
      },
      resource,
    ),
  );
  app.get("/paid/report", async (req, res, next) => {
    try {
      const order = store.get(String(req.query.orderId));
      if (!order.report) throw new Error("REPORT_NOT_PREPARED");
      res.json(order.report);
    } catch (e) {
      next(e);
    }
  });
}

export async function purchase(order: Order) {
  assertQuote(order, order.quote!);
  const path = resolve(config.dataDir, `payment-${order.id}.json`);
  const saved = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : null;
  // A restart after an uncertain broadcast reuses the SAME signed transaction.
  if (saved?.tx) {
    try {
      return await observePayment(saved.tx, order.seller);
    } catch (e) {
      if ((e as Error).message !== "PAYMENT_NOT_CONFIRMED") throw e;
    }
  }
  const { mnemonic } = JSON.parse(
    readFileSync(resolve(config.dataDir, "cardano-agent.json"), "utf8"),
  );
  const base = toClientCardanoSigner({
    mnemonic,
    network: "cardano:preprod",
    provider: config.blockfrostKey
      ? {
          blockfrost: {
            baseUrl: "https://cardano-preprod.blockfrost.io/api/v0",
            projectId: config.blockfrostKey,
          },
        }
      : { koios: { baseUrl: KOIOS_PREPROD } },
  });
  const controlled = {
    getAddress: () => base.getAddress(),
    buildAndSignPaymentTransaction: async (
      input: Parameters<typeof base.buildAndSignPaymentTransaction>[0],
    ) => {
      assertQuote(order, {
        ...order.quote!,
        network: input.network as "cardano:preprod",
        asset: input.asset as "lovelace",
        amount: input.amount,
        recipient: input.payTo,
      });
      if (
        input.extra?.assetTransferMethod &&
        input.extra.assetTransferMethod !== ASSET_TRANSFER_METHOD_DEFAULT
      )
        throw new Error("UNSUPPORTED_TRANSFER_METHOD");
      const signed = await base.buildAndSignPaymentTransaction(input);
      const decoded = decodeCardanoTransaction(signed.transaction);
      if (BigInt(decoded.fee) > BigInt(order.feeCeiling))
        throw new Error("FEE_EXCEEDS_CEILING");
      return signed;
    },
  };
  const client = new x402Client()
    .setSpendControls({
      allowedAssets: [
        {
          network: "cardano:preprod",
          asset: "lovelace",
          maxAmountPerPayment: order.ceiling,
        },
      ],
    })
    .register("cardano:preprod", new ClientScheme(controlled));
  const http = new x402HTTPClient(client);
  let payload = saved?.payload;
  if (!payload) {
    const unpaid = await fetch(order.quote!.resource, {
      signal: AbortSignal.timeout(30000),
    });
    if (unpaid.status !== 402) throw new Error("EXPECTED_X402_CHALLENGE");
    const required = http.getPaymentRequiredResponse((name) =>
      unpaid.headers.get(name),
    );
    payload = await http.createPaymentPayload(required);
    const txData = decodeCardanoTransaction(
      (payload.payload as { transaction: string }).transaction,
    );
    writeFileSync(path, JSON.stringify({ payload, tx: txData.txHash }), {
      mode: 0o600,
    });
  }
  let response: Response;
  try {
    response = await fetch(order.quote!.resource, {
      headers: http.encodePaymentSignatureHeader(payload),
      signal: AbortSignal.timeout(180000),
    });
  } catch (error) {
    // A lost HTTP response can follow a successful payment. Observe the saved
    // transaction instead of creating or broadcasting another purchase.
    if (
      !(error instanceof TypeError) &&
      !["AbortError", "TimeoutError"].includes((error as Error).name)
    )
      throw error;
    return waitForPayment(
      decodeCardanoTransaction(
        (payload.payload as { transaction: string }).transaction,
      ).txHash,
      order.seller,
    );
  }
  if (
    response.status >= 500 ||
    response.status === 408 ||
    response.status === 402
  ) {
    // The facilitator can return a payment-required response after broadcast,
    // as well as time out. Only confirmed chain evidence can resolve the exact
    // saved transaction; an HTTP error alone never proves payment or delivery.
    return waitForPayment(
      decodeCardanoTransaction(
        (payload.payload as { transaction: string }).transaction,
      ).txHash,
      order.seller,
    );
  }
  if (!response.ok) throw new Error(`X402_PAYMENT_HTTP_${response.status}`);
  const settlement = http.getPaymentSettleResponse((name) =>
    response.headers.get(name),
  );
  if (!settlement.success || !settlement.transaction)
    throw new Error("X402_SETTLEMENT_FAILED");
  return waitForPayment(settlement.transaction, order.seller);
}

async function waitForPayment(tx: string, seller: string) {
  for (let n = 0; n < 30; n++) {
    try {
      return await observePayment(tx, seller);
    } catch (e) {
      if ((e as Error).message !== "PAYMENT_NOT_CONFIRMED") throw e;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  throw new Error("PAYMENT_CONFIRMATION_TIMEOUT");
}
