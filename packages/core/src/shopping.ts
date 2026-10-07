import { hash } from "./canonical.ts";
import { assertQuote, type QuoteTerms } from "./quote-policy.ts";
import type { Order, SignedOffer, ShoppingPlan, Receipt } from "./types.ts";

export type SignatureCheck = (
  value: Receipt | SignedOffer,
  key: string,
) => boolean;
export const SHOPPING_GOAL = "Buy me an OY coffee demo pass";
export function shoppingCommitment(
  plan: Pick<ShoppingPlan, "goal" | "budget" | "offers">,
) {
  return hash({ goal: plan.goal, budget: plan.budget, offers: plan.offers });
}
export function chooseOffers(
  terms: QuoteTerms & { sellerKey: string; resource: string },
  offers: SignedOffer[],
  signatureCheck: SignatureCheck,
  now: number,
): Pick<ShoppingPlan, "decisions" | "selected"> {
  if (offers.length < 1 || offers.length > 4)
    throw Error("INVALID_OFFER_COUNT");
  const decisions = offers.map((offer) => {
    try {
      if (offer.version !== 1 || !signatureCheck(offer, terms.sellerKey))
        throw Error("INVALID_SIGNATURE");
      if (offer.sku !== "coffee-pass") throw Error("WRONG_ITEM");
      // Every accepted offer must stay on our fixed paid resource. No remote URL
      // supplied by a shopper or offer can enter the payment client.
      if (offer.quote.resource !== terms.resource)
        throw Error("WRONG_RESOURCE");
      assertQuote(terms, offer.quote, now);
      return { accepted: true, reason: "MATCHES_GOAL_AND_BUDGET" };
    } catch (error) {
      return {
        accepted: false,
        reason: error instanceof Error ? error.message : "INVALID_OFFER",
      };
    }
  });
  const eligible = decisions.flatMap((decision, index) =>
    decision.accepted ? [index] : [],
  );
  eligible.sort((a, b) =>
    BigInt(offers[a].quote.amount) < BigInt(offers[b].quote.amount)
      ? -1
      : BigInt(offers[a].quote.amount) > BigInt(offers[b].quote.amount)
        ? 1
        : a - b,
  );
  return { decisions, selected: eligible[0] ?? null };
}

export function verifyShoppingPlan(
  order: Order,
  signatureCheck: SignatureCheck,
  now: number,
) {
  try {
    const plan = order.shopping;
    if (
      !plan ||
      plan.goal !== SHOPPING_GOAL ||
      plan.budget !== order.ceiling ||
      shoppingCommitment(plan) !== order.input.retail?.shoppingHash
    )
      return false;
    if (!order.quote) return false;
    const decision = chooseOffers(
      { ...order, quoteHash: undefined, resource: order.quote.resource },
      plan.offers,
      signatureCheck,
      now,
    );
    return (
      decision.selected !== null &&
      decision.selected === plan.selected &&
      hash(decision.decisions) === hash(plan.decisions) &&
      hash(plan.offers[decision.selected].quote) === order.quoteHash
    );
  } catch {
    return false;
  }
}
