import type { HTTPSendRequester } from "@chainlink/cre-sdk";
import { ed25519 } from "@noble/curves/ed25519";
import { base58 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha256";
import { canonical, hash } from "../../packages/core/src/canonical.ts";
import {
  auditDecision,
  solanaTransactionFact,
  type AuditClaim,
} from "../../packages/core/src/audit.ts";
import type { Order, SourceFact } from "../../packages/core/src/types.ts";
import { assertSolanaDevnet } from "../../packages/core/src/networks.ts";
import {
  NOWNODES_PREPROD,
  assertPreprodGenesis,
  blockfrostPayment,
} from "../../packages/core/src/cardano-payment.ts";
import type { Config } from "./workflow.ts";

// Fresh source reads and official CRE execution, with no settlement authority.
export function verifyAudit(
  send: HTTPSendRequester,
  c: Config & { now: number },
) {
  const get = (
    url: string,
    headers: Record<string, string> = {},
    body?: unknown,
  ) => {
    const response = send
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
    if (response.statusCode !== 200)
      throw new Error(`AUDIT_SOURCE_HTTP_${response.statusCode}`);
    return JSON.parse(Buffer.from(response.body).toString("utf8"));
  };
  const rpc = (method: string, params: unknown[], mainnet = false) => {
    const value = get(
      mainnet ? "https://sol.nownodes.io" : c.solanaRpc,
      mainnet ? { "api-key": c.nownodesKey } : {},
      { jsonrpc: "2.0", id: 1, method, params },
    );
    if (value.error) throw new Error("AUDIT_RPC_FAILED");
    return value.result;
  };
  const envelope = get(`${c.apiUrl}/api/challenges/${c.auditId}`);
  const claim: AuditClaim = envelope.claim;
  if (
    claim.id !== c.auditId ||
    claim.referenceOrderId !== c.orderId ||
    !Array.isArray(claim.facts) ||
    claim.facts.length !== 2
  )
    throw new Error("AUDIT_BINDING_MISMATCH");
  const order: Order = get(`${c.apiUrl}/api/orders/${c.orderId}`);
  if (
    order.id !== c.orderId ||
    !order.receipt ||
    !order.report ||
    !order.solana ||
    !["settled", "refunded"].includes(order.status)
  )
    throw new Error("AUDIT_REFERENCE_REQUIRED");
  assertSolanaDevnet(rpc("getGenesisHash", []));
  const account = rpc("getAccountInfo", [
    order.solana.pda,
    { encoding: "base64", commitment: "confirmed" },
  ]).value;
  const bytes = account
    ? Buffer.from(account.data[0], "base64")
    : Buffer.alloc(0);
  const referenceValid =
    !!account &&
    account.owner === c.programId &&
    bytes.length === 328 &&
    [2, 3].includes(bytes[1]) &&
    Buffer.from(sha256(new TextEncoder().encode(order.id))).equals(
      bytes.subarray(8, 40),
    ) &&
    Buffer.from(base58.decode(order.buyer)).equals(bytes.subarray(40, 72)) &&
    Buffer.from(order.inputHash, "hex").equals(bytes.subarray(136, 168));
  const headers = { "api-key": c.nownodesKey };
  assertPreprodGenesis(get(`${NOWNODES_PREPROD}/genesis`, headers));
  const payment = blockfrostPayment(
    order.receipt.paymentHash,
    order.seller,
    get(`${NOWNODES_PREPROD}/txs/${order.receipt.paymentHash}`, headers),
    get(`${NOWNODES_PREPROD}/txs/${order.receipt.paymentHash}/utxos`, headers),
  );
  const paymentValid =
    payment.confirmed &&
    payment.recipient === order.seller &&
    payment.amount === order.quote?.amount &&
    payment.network === "cardano:preprod";
  const actual: SourceFact[] = claim.facts.map((fact) => {
    if (fact.network === "solana:mainnet") {
      if (fact.wallet !== order.input.solanaWallet)
        throw new Error("AUDIT_WALLET_MISMATCH");
      const tx = rpc(
        "getTransaction",
        [
          fact.tx,
          { commitment: "finalized", maxSupportedTransactionVersion: 0 },
        ],
        true,
      );
      const actual = solanaTransactionFact(fact.wallet, fact.tx, tx);
      if (!actual) throw new Error("AUDIT_SOLANA_SOURCE_UNAVAILABLE");
      return actual;
    }
    const anchor = order.report!.facts.find(
      (f) =>
        f.network === fact.network &&
        f.wallet === fact.wallet &&
        f.tx === fact.tx,
    );
    if (!anchor || fact.network !== "cardano:mainnet")
      throw new Error("AUDIT_TRANSACTION_NOT_IN_REFERENCE");
    const tx = get(
      `https://ada-blockfrost.nownodes.io/txs/${fact.tx}`,
      headers,
    );
    if (!tx || !tx.block) throw new Error("AUDIT_TRANSACTION_UNCONFIRMED");
    return {
      ...anchor,
      slot: String(tx.slot),
      fee: String(tx.fees),
      confirmed: true,
    };
  });
  let signatureValid = false;
  try {
    const key = Buffer.from(
      c.auditKey!.replace(/-----[^-]+-----|\s/g, ""),
      "base64",
    ).subarray(-32);
    signatureValid = ed25519.verify(
      Buffer.from(envelope.signature, "base64"),
      new TextEncoder().encode(canonical(claim)),
      key,
    );
  } catch {}
  return JSON.stringify(
    auditDecision(
      claim,
      actual,
      signatureValid,
      referenceValid,
      paymentValid,
      c.now,
    ),
  );
}
