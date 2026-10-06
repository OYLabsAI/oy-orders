import {
  cre,
  consensusIdenticalAggregation,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import { sha256 } from "@noble/hashes/sha256";
import { ed25519 } from "@noble/curves/ed25519";
import { base58 } from "@scure/base";
import { canonical, hash } from "../../packages/core/src/canonical.ts";
import { verifyWithSignature } from "../../packages/core/src/verification.ts";
import {
  KOIOS_PREPROD,
  koiosPayment,
  koiosPaymentRequest,
} from "../../packages/core/src/cardano-payment.ts";
import type {
  Order,
  Receipt,
  SourceFact,
} from "../../packages/core/src/types.ts";
export type Config = {
  orderId: string;
  apiUrl: string;
  solanaRpc: string;
  programId: string;
  sellerKey: string;
  worker: string;
  authority: string;
  blockfrostKey: string;
  nownodesKey: string;
};
const encoder = new TextEncoder();
function sellerSignature(receipt: Receipt, key: string) {
  try {
    const { signature, ...body } = receipt;
    const der = Buffer.from(key.replace(/-----[^-]+-----|\s/g, ""), "base64");
    return ed25519.verify(
      Buffer.from(signature, "base64"),
      encoder.encode(canonical(body)),
      der.subarray(-32),
    );
  } catch {
    return false;
  }
}
export function expectedPda(order: Order, program: string) {
  const buyer = base58.decode(order.buyer),
    nonce = sha256(encoder.encode(order.id));
  for (let bump = 255; bump >= 0; bump--) {
    const candidate = sha256(
      Buffer.concat([
        encoder.encode("order"),
        buyer,
        nonce,
        Uint8Array.of(bump),
        base58.decode(program),
        encoder.encode("ProgramDerivedAddress"),
      ]),
    );
    try {
      ed25519.Point.fromHex(candidate);
    } catch {
      return base58.encode(candidate);
    }
  }
  throw new Error("PDA_DERIVATION_FAILED");
}
export function verifyRemote(
  send: HTTPSendRequester,
  c: Config & { now: number },
): string {
  const get = (
    url: string,
    headers: Record<string, string> = {},
    body?: unknown,
  ) => {
    const r = send
      .sendRequest({
        url,
        method: body === undefined ? "GET" : "POST",
        headers:
          body === undefined
            ? headers
            : { ...headers, "Content-Type": "application/json" },
        ...(body === undefined
          ? {}
          : { body: Buffer.from(JSON.stringify(body)).toString("base64") }),
      })
      .result();
    if (r.statusCode !== 200) throw new Error(`SOURCE_HTTP_${r.statusCode}`);
    return JSON.parse(Buffer.from(r.body).toString("utf8"));
  };
  const rpc = (method: string, params: unknown[], mainnet = false) => {
    const r = get(
      mainnet ? "https://sol.nownodes.io" : c.solanaRpc,
      mainnet ? { "api-key": c.nownodesKey } : {},
      { jsonrpc: "2.0", id: 1, method, params },
    );
    if (r.error) throw new Error("RPC_READ_FAILED");
    return r.result;
  };
  const order: Order = get(`${c.apiUrl}/api/orders/${c.orderId}`);
  if (
    order.id !== c.orderId ||
    order.mode !== "live" ||
    order.sellerKey !== c.sellerKey ||
    order.worker !== c.worker
  )
    throw new Error("WORKFLOW_ORDER_MISMATCH");
  if (!order.receipt || !order.quote || !order.report || !order.solana)
    throw new Error("INCOMPLETE_EVIDENCE");
  const pda = expectedPda(order, c.programId);
  if (pda !== order.solana.pda) throw new Error("PDA_MISMATCH");
  const escrow = rpc("getAccountInfo", [
    pda,
    { encoding: "base64", commitment: "confirmed" },
  ]).value;
  if (!escrow || escrow.owner !== c.programId)
    throw new Error("ESCROW_OWNER_MISMATCH");
  const bytes = Buffer.from(escrow.data[0], "base64");
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const eq = (offset: number, value: Uint8Array) =>
    Buffer.from(value).equals(bytes.subarray(offset, offset + 32));
  const rawHash = (s: string) => sha256(encoder.encode(s));
  if (
    bytes.length !== 328 ||
    bytes[0] !== 1 ||
    bytes[1] !== 1 ||
    !eq(8, rawHash(order.id)) ||
    !eq(40, base58.decode(order.buyer)) ||
    !eq(72, base58.decode(c.worker)) ||
    !eq(104, base58.decode(c.authority)) ||
    !eq(136, Buffer.from(order.inputHash, "hex")) ||
    !eq(168, rawHash(order.seller)) ||
    !eq(200, Buffer.from(order.quoteHash!, "hex")) ||
    data.getBigUint64(296, true) !== BigInt(order.reward) ||
    data.getBigUint64(304, true) !==
      BigInt(Math.floor(order.deadline / 1000)) ||
    data.getBigUint64(312, true) !== BigInt(order.ceiling) ||
    data.getBigUint64(320, true) !== BigInt(order.quote.amount) ||
    BigInt(escrow.lamports) < BigInt(order.reward)
  )
    throw new Error("ESCROW_TERMS_MISMATCH");
  const bf = "https://cardano-preprod.blockfrost.io/api/v0";
  const paymentHash = order.receipt.paymentHash;
  if (!/^[a-f0-9]{64}$/.test(paymentHash))
    throw new Error("INVALID_PAYMENT_HASH");
  const payment = c.blockfrostKey
    ? (() => {
        const info = get(`${bf}/txs/${paymentHash}`, {
            project_id: c.blockfrostKey,
          }),
          utxos = get(`${bf}/txs/${paymentHash}/utxos`, {
            project_id: c.blockfrostKey,
          });
        const amount = utxos.outputs
          .filter((o: any) => o.address === order.seller)
          .flatMap((o: any) => o.amount)
          .filter((a: any) => a.unit === "lovelace")
          .reduce((n: bigint, a: any) => n + BigInt(a.quantity), 0n);
        return {
          tx: paymentHash,
          recipient: order.seller,
          amount: amount.toString(),
          network: "cardano:preprod",
          asset: "lovelace",
          fee: String(info.fees),
          confirmed: !!info.block,
        };
      })()
    : koiosPayment(
        paymentHash,
        order.seller,
        get(`${KOIOS_PREPROD}/tx_info`, {}, koiosPaymentRequest(paymentHash)),
      );
  const facts: SourceFact[] = [];
  const signatures = rpc(
    "getSignaturesForAddress",
    [order.input.solanaWallet, { limit: 5, commitment: "finalized" }],
    true,
  );
  for (const t of signatures.filter((t: any) => !t.err)) {
    const tx = rpc(
      "getTransaction",
      [
        t.signature,
        { commitment: "finalized", maxSupportedTransactionVersion: 0 },
      ],
      true,
    );
    if (!tx || tx.meta.err) throw new Error("SOURCE_TX_UNCONFIRMED");
    facts.push({
      network: "solana:mainnet",
      wallet: order.input.solanaWallet,
      tx: t.signature,
      slot: String(tx.slot),
      fee: String(tx.meta.fee),
      confirmed: true,
    });
  }
  const ada = "https://ada-blockfrost.nownodes.io",
    headers = { "api-key": c.nownodesKey };
  const adaTransactions = get(
    `${ada}/addresses/${order.input.cardanoWallet}/transactions?count=5&order=desc`,
    headers,
  );
  for (const t of adaTransactions) {
    const tx = get(`${ada}/txs/${t.tx_hash}`, headers);
    facts.push({
      network: "cardano:mainnet",
      wallet: order.input.cardanoWallet,
      tx: t.tx_hash,
      slot: String(tx.slot),
      fee: String(tx.fees),
      confirmed: !!tx.block,
    });
  }
  const result = verifyWithSignature(
    order,
    payment,
    facts,
    sellerSignature,
    c.now,
  );
  result.mode = "cre-simulation";
  result.checks.unshift({
    name: "Solana escrow",
    passed: true,
    detail: "Actual reserved PDA and immutable chain terms match",
  });
  return JSON.stringify(result);
}
function onTrigger(runtime: Runtime<Config>) {
  const c = runtime.config;
  if (
    !/^https?:\/\//.test(c.apiUrl) ||
    !/^[0-9a-f-]{36}$/.test(c.orderId) ||
    !c.nownodesKey
  )
    throw new Error("WORKFLOW_CONFIG_REQUIRED");
  const output = new cre.capabilities.HTTPClient()
    .sendRequest(
      runtime,
      verifyRemote,
      consensusIdenticalAggregation<string>(),
    )({ ...c, now: runtime.now().getTime() })
    .result();
  runtime.log(`ORCA_VERIFICATION:${output}`);
  return output;
}
export function initWorkflow() {
  return [
    cre.handler(
      new cre.capabilities.CronCapability().trigger({
        schedule: "0 * * * * *",
      }),
      onTrigger,
    ),
  ];
}
