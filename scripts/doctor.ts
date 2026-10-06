import { readiness, config } from "../apps/api/src/config.ts";
import { connection } from "../apps/api/src/solana.ts";
import { Keypair } from "@solana/web3.js";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { KOIOS_PREPROD } from "../packages/core/src/cardano-payment.ts";
const report: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  mode: config.mode,
  configuration: readiness(),
};
console.log("Mode:", config.mode);
for (const check of readiness())
  console.log(
    `${check.ready ? "CONFIGURED" : "MISSING"} ${check.name}: ${check.detail}`,
  );
try {
  console.log("Solana Devnet slot:", await connection.getSlot());
  const wallets = ["authority", "worker", "demo-buyer"]
    .filter((name) => existsSync(resolve(config.dataDir, `${name}.json`)))
    .map((name) => ({
      name,
      key: Keypair.fromSecretKey(
        Uint8Array.from(
          JSON.parse(
            readFileSync(resolve(config.dataDir, `${name}.json`), "utf8"),
          ),
        ),
      ).publicKey,
    }));
  const accounts = await connection.getMultipleAccountsInfo(
    wallets.map((w) => w.key),
  );
  report.solanaWallets = wallets.map((w, i) => ({
    name: w.name,
    address: w.key.toBase58(),
    lamports: accounts[i]?.lamports ?? 0,
  }));
  for (const wallet of report.solanaWallets as {
    name: string;
    address: string;
    lamports: number;
  }[])
    console.log(
      `${wallet.lamports ? "FUNDED" : "UNFUNDED"} ${wallet.name}: ${wallet.lamports / 1e9} Devnet SOL (${wallet.address})`,
    );
} catch {
  console.log("Devnet RPC unavailable");
}
const cardanoPath = resolve(config.dataDir, "cardano-agent.json");
if (existsSync(cardanoPath)) {
  const address = JSON.parse(readFileSync(cardanoPath, "utf8")).address;
  try {
    const response = await fetch(`${KOIOS_PREPROD}/address_info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _addresses: [address] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("PROVIDER_UNAVAILABLE");
    const data = (await response.json()) as { balance: string }[];
    const balance = data[0]?.balance ?? "0";
    report.cardanoWallet = {
      network: "preprod",
      address,
      lovelace: balance,
      provider: "Koios",
      http: response.status,
    };
    console.log(
      `${BigInt(balance) >= 4000000n ? "FUNDED" : "UNFUNDED"} Cardano agent: ${Number(balance) / 1e6} preprod tADA`,
    );
  } catch {
    console.log("Cardano preprod provider probe unavailable");
  }
}
try {
  execFileSync(resolve(config.creBin), ["whoami", "--non-interactive"], {
    timeout: 20000,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PATH: `${resolve(".local/bin")}:${process.env.PATH}`,
    },
  });
  report.creAuthenticated = true;
  console.log(
    "AUTHENTICATED CRE CLI; order simulation still requires funded chain evidence",
  );
} catch {
  report.creAuthenticated = false;
  console.log("MISSING CRE authentication");
}
if (process.argv.includes("--json")) {
  writeFileSync(
    "docs/evidence/setup-audit.json",
    JSON.stringify(report, null, 2),
  );
  console.log("Saved public setup audit: docs/evidence/setup-audit.json");
}
console.log(
  "Configured is not proven. See docs/evidence/STATUS.md for executed evidence.",
);
