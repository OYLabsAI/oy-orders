import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
} from "node:crypto";
if (existsSync(".env")) process.loadEnvFile(".env");
export const config = {
  mode:
    process.env.MODE === "live" ? ("live" as const) : ("rehearsal" as const),
  port: Number(process.env.PORT ?? 8787),
  dataDir: resolve(process.env.DATA_DIR ?? ".local"),
  apiUrl:
    process.env.PUBLIC_API_URL ??
    `http://localhost:${process.env.PORT ?? 8787}`,
  solanaRpc: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  program: process.env.SOLANA_PROGRAM_ID ?? "",
  nownodesKey: process.env.NOWNODES_API_KEY ?? "",
  blockfrostKey: process.env.BLOCKFROST_PREPROD_KEY ?? "",
  cardanoPaymentProvider:
    process.env.CARDANO_PAYMENT_PROVIDER === "nownodes"
      ? ("nownodes" as const)
      : ("legacy" as const),
  seller: process.env.CARDANO_SELLER_ADDRESS ?? "",
  creBin: process.env.CRE_BIN ?? ".local/bin/cre",
  creTarget: process.env.CRE_TARGET ?? "staging-settings",
  creDir: resolve(process.env.CRE_WORKFLOW_DIR ?? "workflows/verify-order"),
};
mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
const path = resolve(config.dataDir, "seller-signing.pem");
if (!existsSync(path))
  writeFileSync(
    path,
    generateKeyPairSync("ed25519").privateKey.export({
      type: "pkcs8",
      format: "pem",
    }),
    { mode: 0o600 },
  );
export const sellerKey = createPrivateKey(readFileSync(path));
export const sellerPublicKey = createPublicKey(sellerKey)
  .export({ type: "spki", format: "pem" })
  .toString();
export function readiness() {
  return [
    {
      name: "Solana escrow",
      ready: !!config.program,
      detail: config.program
        ? "Devnet program configured; health probe required"
        : "Program deployment required",
    },
    {
      name: "Cardano x402",
      ready:
        !!config.seller &&
        existsSync(resolve(config.dataDir, "cardano-agent.json")),
      detail: `Preprod signer: ${config.blockfrostKey ? "Blockfrost" : "Koios"}; payment proof: ${config.cardanoPaymentProvider === "nownodes" ? "NOWNodes" : config.blockfrostKey ? "Blockfrost" : "Koios"}`,
    },
    {
      name: "NOWNodes",
      ready: !!config.nownodesKey,
      detail: config.nownodesKey
        ? "Key configured; endpoint probe required"
        : "€15 credits redeemed. Plan activation and API key required.",
    },
    {
      name: "Chainlink CRE",
      ready:
        existsSync(config.creBin) &&
        (!!process.env.CRE_API_KEY || process.env.CRE_AUTHENTICATED === "true"),
      detail: "CLI login and a successful simulation required",
    },
  ];
}
