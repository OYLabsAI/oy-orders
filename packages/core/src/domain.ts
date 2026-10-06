import type {
  Order,
  Quote,
  Receipt,
  ReceiptBody,
  Status,
  SourceFact,
  Verification,
  Payment,
} from "./types.ts";
export type * from "./types.ts";
import { canonical, hash } from "./canonical.ts";
export { canonical, hash } from "./canonical.ts";
import { verifyWithSignature } from "./verification.ts";
import { z } from "zod";
import { sign, verify, createPublicKey, type KeyObject } from "node:crypto";

export const integer = z.string().regex(/^(0|[1-9][0-9]*)$/);
export const digest = z.string().regex(/^[0-9a-f]{64}$/);
export const solAddress = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
export const cardanoAddress = z.string().regex(/^addr1[0-9a-z]{50,110}$/);
export const inputSchema = z
  .object({
    solanaWallet: solAddress,
    cardanoWallet: cardanoAddress,
    scenario: z.enum(["success", "tampered", "expiry"]).default("success"),
  })
  .strict();
export function receiptBody(receipt: Receipt): ReceiptBody {
  const { signature: _, ...body } = receipt;
  return body;
}
export function signReceipt(body: ReceiptBody, key: KeyObject): Receipt {
  return {
    ...body,
    signature: sign(null, Buffer.from(canonical(body)), key).toString("base64"),
  };
}
export function verifySignature(receipt: Receipt, publicKey: string): boolean {
  try {
    return verify(
      null,
      Buffer.from(canonical(receiptBody(receipt))),
      createPublicKey(publicKey),
      Buffer.from(receipt.signature, "base64"),
    );
  } catch {
    return false;
  }
}

export function assertQuote(
  order: Order,
  quote: Quote,
  now = Date.now(),
): void {
  if (quote.orderId !== order.id) throw new Error("WRONG_ORDER");
  if (quote.network !== "cardano:preprod" || quote.asset !== "lovelace")
    throw new Error("WRONG_ASSET_OR_NETWORK");
  if (quote.recipient !== order.seller) throw new Error("WRONG_RECIPIENT");
  if (
    !integer.safeParse(quote.amount).success ||
    BigInt(quote.amount) <= 0n ||
    BigInt(quote.amount) > BigInt(order.ceiling)
  )
    throw new Error("PRICE_EXCEEDS_CEILING");
  if (
    quote.expiresAt > order.deadline ||
    quote.expiresAt <= now ||
    now >= order.deadline
  )
    throw new Error("EXPIRED_QUOTE");
  if (order.quoteHash && order.quoteHash !== hash(quote))
    throw new Error("QUOTE_ALREADY_RESERVED");
}

export function verifyEvidence(
  order: Order,
  payment: Payment,
  sourceFacts: SourceFact[],
  now = Date.now(),
): Verification {
  return verifyWithSignature(order, payment, sourceFacts, verifySignature, now);
}

const allowed: Record<Status, Status[]> = {
  created: ["funded", "expired", "blocked"],
  funded: ["reserved", "expired", "blocked"],
  reserved: ["purchasing", "expired", "blocked"],
  purchasing: ["paid", "blocked", "expired"],
  paid: ["verifying", "expired", "blocked"],
  verifying: ["settled", "rejected", "expired", "blocked"],
  settled: [],
  rejected: ["expired", "refunded"],
  expired: ["refunded"],
  refunded: [],
  blocked: ["expired"],
};
export function transition(order: Order, status: Status): Order {
  if (!allowed[order.status].includes(status))
    throw new Error(`INVALID_TRANSITION:${order.status}:${status}`);
  return { ...order, status };
}
