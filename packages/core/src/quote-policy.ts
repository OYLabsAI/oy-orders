import { hash } from "./canonical.ts";
import type { Order, Quote } from "./types.ts";

export type QuoteTerms = Pick<
  Order,
  "id" | "seller" | "ceiling" | "deadline" | "quoteHash"
>;
export function assertQuote(
  order: QuoteTerms,
  quote: Quote,
  now = Date.now(),
): void {
  if (quote.orderId !== order.id) throw Error("WRONG_ORDER");
  if (quote.network !== "cardano:preprod" || quote.asset !== "lovelace")
    throw Error("WRONG_ASSET_OR_NETWORK");
  if (quote.recipient !== order.seller) throw Error("WRONG_RECIPIENT");
  if (
    !/^(0|[1-9][0-9]*)$/.test(quote.amount) ||
    BigInt(quote.amount) <= 0n ||
    BigInt(quote.amount) > BigInt(order.ceiling)
  )
    throw Error("PRICE_EXCEEDS_CEILING");
  if (
    quote.expiresAt > order.deadline ||
    quote.expiresAt <= now ||
    now >= order.deadline
  )
    throw Error("EXPIRED_QUOTE");
  if (order.quoteHash && order.quoteHash !== hash(quote))
    throw Error("QUOTE_ALREADY_RESERVED");
}
