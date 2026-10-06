import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { config } from "../apps/api/src/config.ts";
import { writeLoaderBuffer } from "./write-loader-buffer.ts";
const wallet = (name: string) => {
  const path = resolve(config.dataDir, `${name}.json`);
  if (!existsSync(path))
    writeFileSync(
      path,
      JSON.stringify(Array.from(Keypair.generate().secretKey)),
      { mode: 0o600 },
    );
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))),
  );
};
const payer = wallet("authority"),
  program = wallet("program-v3");
const buffer = wallet("program-buffer-v3");
const connection = new Connection(config.solanaRpc, "confirmed");
if (
  (await connection.getGenesisHash()) !==
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw new Error("DEVNET_ONLY");
const loader = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const binary = readFileSync("docs/evidence/orca_orders.so");
const balance = await connection.getBalance(payer.publicKey);
console.log("Devnet balance lamports:", balance);
if (!(await connection.getAccountInfo(program.publicKey))?.executable) {
  const minimum = await connection.getMinimumBalanceForRentExemption(
    binary.length + 45,
  );
  const bufferExists = await connection.getAccountInfo(buffer.publicKey);
  if (balance < minimum * (bufferExists ? 1 : 2) + 10000000)
    throw new Error("DEVNET_FUNDING_REQUIRED");
  const bin = resolve(process.env.SOLANA_CLI_BIN ?? ".local/bin/solana");
  if (!existsSync(bin)) throw new Error("OFFICIAL_AGAVE_CLI_REQUIRED");
  await writeLoaderBuffer(connection, payer, buffer, binary);
  await new Promise<void>((resolveDone, reject) => {
    const child = spawn(
      bin,
      [
        "--url",
        config.solanaRpc,
        "--keypair",
        resolve(config.dataDir, "authority.json"),
        "program",
        "deploy",
        "--program-id",
        resolve(config.dataDir, "program-v3.json"),
        "--buffer",
        resolve(config.dataDir, "program-buffer-v3.json"),
        "--upgrade-authority",
        resolve(config.dataDir, "authority.json"),
        "--max-len",
        String(binary.length),
        "--use-rpc",
        "--max-sign-attempts",
        "5",
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolveDone()
        : reject(new Error(`DEPLOYMENT_FAILED_${code}`)),
    );
  });
}
const info = await connection.getAccountInfo(program.publicKey);
if (!info?.executable || !info.owner.equals(loader))
  throw new Error("PROGRAM_NOT_EXECUTABLE");
const programData = PublicKey.findProgramAddressSync(
  [program.publicKey.toBuffer()],
  loader,
)[0];
const deployed = await connection.getAccountInfo(programData);
if (
  !deployed?.owner.equals(loader) ||
  !deployed.data.subarray(45).equals(binary)
)
  throw new Error("DEPLOYED_BINARY_MISMATCH");
const transactions = await connection.getSignaturesForAddress(
  program.publicKey,
  { limit: 50 },
);
writeFileSync(
  "docs/evidence/solana-deployment.json",
  JSON.stringify(
    {
      programId: program.publicKey.toBase58(),
      cluster: "devnet",
      executable: info.executable,
      compiler: "Solana Playground",
      loader: "BPFLoaderUpgradeable / loader-v3",
      programData: programData.toBase58(),
      binarySha256: createHash("sha256").update(binary).digest("hex"),
      binaryReadBackVerified: true,
      upgradeAuthority: payer.publicKey.toBase58(),
      transactions,
      deployedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("Deployed", program.publicKey.toBase58());
const setting = `SOLANA_PROGRAM_ID=${program.publicKey.toBase58()}`;
let env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
env = /^SOLANA_PROGRAM_ID=.*$/m.test(env)
  ? env.replace(/^SOLANA_PROGRAM_ID=.*$/m, setting)
  : `${env}\n${setting}\n`;
writeFileSync(".env", env);
chmodSync(".env", 0o600);
console.log("Stored verified deployed program ID in private .env.");
