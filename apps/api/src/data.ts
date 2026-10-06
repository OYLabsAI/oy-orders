import type { SourceFact, Order } from "../../../packages/core/src/domain.ts";
import { config } from "./config.ts";
import {
  KOIOS_PREPROD,
  koiosPayment,
  koiosPaymentRequest,
  NOWNODES_PREPROD,
  assertPreprodGenesis,
  blockfrostPayment,
} from "../../../packages/core/src/cardano-payment.ts";

export async function fetchJson(
  url: string,
  init: RequestInit = {},
): Promise<any> {
  for (let n = 0; n < 3; n++) {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      if (n >= 2) throw error;
      await new Promise((r) => setTimeout(r, 500 * 2 ** n));
      continue;
    }
    if (response.status === 404) return null;
    if ((response.status === 429 || response.status >= 500) && n < 2) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** n));
      continue;
    }
    if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
    return response.json();
  }
  throw new Error("UPSTREAM_UNAVAILABLE");
}
export async function solanaRpc(
  method: string,
  params: unknown[],
  mainnet = false,
) {
  const body = await fetchJson(
    mainnet ? "https://sol.nownodes.io" : config.solanaRpc,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(mainnet ? { "api-key": config.nownodesKey } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    },
  );
  if (body.error) throw new Error(`SOLANA_RPC_${body.error.code}`);
  return body.result;
}
export async function readFacts(order: Order): Promise<SourceFact[]> {
  if (!config.nownodesKey) throw new Error("NOWNODES_KEY_REQUIRED");
  const sol = await solanaRpc(
    "getSignaturesForAddress",
    [order.input.solanaWallet, { limit: 5, commitment: "finalized" }],
    true,
  );
  const solFacts: SourceFact[] = await Promise.all(
    sol
      .filter((t: any) => !t.err)
      .map(async (t: any) => {
        const tx = await solanaRpc(
          "getTransaction",
          [
            t.signature,
            { commitment: "finalized", maxSupportedTransactionVersion: 0 },
          ],
          true,
        );
        if (!tx || tx.meta.err) throw new Error("SOURCE_TX_NOT_CONFIRMED");
        return {
          network: "solana:mainnet",
          wallet: order.input.solanaWallet,
          tx: t.signature,
          slot: String(tx.slot),
          fee: String(tx.meta.fee),
          confirmed: true,
        } as SourceFact;
      }),
  );
  const headers = { "api-key": config.nownodesKey };
  const ada =
    (await fetchJson(
      `https://ada-blockfrost.nownodes.io/addresses/${order.input.cardanoWallet}/transactions?count=5&order=desc`,
      { headers },
    )) ?? [];
  const adaFacts: SourceFact[] = await Promise.all(
    ada.map(async (t: any) => {
      const tx = await fetchJson(
        `https://ada-blockfrost.nownodes.io/txs/${t.tx_hash}`,
        { headers },
      );
      if (!tx) throw new Error("SOURCE_TX_NOT_CONFIRMED");
      return {
        network: "cardano:mainnet",
        wallet: order.input.cardanoWallet,
        tx: t.tx_hash,
        slot: String(tx.slot),
        fee: String(tx.fees),
        confirmed: true,
      } as SourceFact;
    }),
  );
  return [...solFacts, ...adaFacts];
}
export async function observePayment(tx: string, recipient: string) {
  if (!/^[0-9a-f]{64}$/.test(tx)) throw new Error("INVALID_PAYMENT_HASH");
  if (config.cardanoPaymentProvider === "nownodes") {
    if (!config.nownodesKey) throw new Error("NOWNODES_KEY_REQUIRED");
    const headers = { "api-key": config.nownodesKey };
    assertPreprodGenesis(
      await fetchJson(`${NOWNODES_PREPROD}/genesis`, { headers }),
    );
    const [info, utxos] = await Promise.all([
      fetchJson(`${NOWNODES_PREPROD}/txs/${tx}`, { headers }),
      fetchJson(`${NOWNODES_PREPROD}/txs/${tx}/utxos`, { headers }),
    ]);
    return blockfrostPayment(tx, recipient, info, utxos);
  }
  if (!config.blockfrostKey) {
    return koiosPayment(
      tx,
      recipient,
      await fetchJson(`${KOIOS_PREPROD}/tx_info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(koiosPaymentRequest(tx)),
      }),
    );
  }
  const headers = { project_id: config.blockfrostKey };
  const root = "https://cardano-preprod.blockfrost.io/api/v0";
  const [info, utxos] = await Promise.all([
    fetchJson(`${root}/txs/${tx}`, { headers }),
    fetchJson(`${root}/txs/${tx}/utxos`, { headers }),
  ]);
  return blockfrostPayment(tx, recipient, info, utxos);
}
