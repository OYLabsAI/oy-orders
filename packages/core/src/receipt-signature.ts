import { ed25519 } from "@noble/curves/ed25519";
import { base64 } from "@scure/base";
import { canonical } from "./canonical.ts";
import type { Receipt, SignedOffer } from "./types.ts";

export function verifyReceiptSignature(
  receipt: Receipt | SignedOffer,
  key: string,
): boolean {
  try {
    const { signature, ...body } = receipt;
    const der = base64.decode(key.replace(/-----[^-]+-----|\s/g, ""));
    if (der.length !== 44) return false;
    return ed25519.verify(
      base64.decode(signature),
      new TextEncoder().encode(canonical(body)),
      der.subarray(-32),
    );
  } catch {
    return false;
  }
}
