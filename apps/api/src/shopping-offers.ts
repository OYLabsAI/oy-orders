import { sign } from "node:crypto";
import {
  canonical,
  verifySignature,
} from "../../../packages/core/src/domain.ts";
import {
  chooseOffers,
  SHOPPING_GOAL,
} from "../../../packages/core/src/shopping.ts";
import { COFFEE_PASS } from "../../../packages/core/src/retail.ts";
import type {
  SignedOffer,
  ShoppingPlan,
} from "../../../packages/core/src/types.ts";
import type { QuoteTerms } from "../../../packages/core/src/quote-policy.ts";
import { config, sellerKey, sellerPublicKey } from "./config.ts";

// These are OY-operated test offers, not real independent merchants. They are
// deliberately adversarial inputs to the same policy used by the paid worker.
export function shoppingPlan(terms: QuoteTerms, now: number): ShoppingPlan {
  const resource = `${config.apiUrl}/paid/report?orderId=${terms.id}`;
  const offer = (label: string, sku: string, amount: string): SignedOffer => {
    const body = {
      version: 1 as const,
      label,
      sku,
      quote: {
        orderId: terms.id,
        network: "cardano:preprod" as const,
        asset: "lovelace" as const,
        amount,
        recipient: terms.seller,
        expiresAt: terms.deadline,
        resource,
      },
    };
    return {
      ...body,
      signature: sign(null, Buffer.from(canonical(body)), sellerKey).toString(
        "base64",
      ),
    };
  };
  const bargain = offer(
    "Too-good-to-be-true price",
    COFFEE_PASS.sku,
    COFFEE_PASS.supplierPrice,
  );
  bargain.quote.amount = "100000"; // A price altered after signing: genuinely invalid signature.
  const offers = [
    bargain,
    offer("Cheaper, but the wrong item", "music-pass", "200000"),
    offer("Right item, too expensive", COFFEE_PASS.sku, "4000000"),
    offer(
      "The matching coffee pass",
      COFFEE_PASS.sku,
      COFFEE_PASS.supplierPrice,
    ),
  ];
  return {
    goal: SHOPPING_GOAL,
    budget: terms.ceiling,
    offers,
    ...chooseOffers(
      { ...terms, sellerKey: sellerPublicKey, resource },
      offers,
      verifySignature,
      now,
    ),
    evaluatedAt: now,
  };
}
