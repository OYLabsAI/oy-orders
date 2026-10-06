import {
  BpfLoader,
  BPF_LOADER_PROGRAM_ID,
  Connection,
  Keypair,
} from "@solana/web3.js";
import { readFileSync, writeFileSync } from "node:fs";
const wallet = (name: string) =>
  Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(`.local/${name}.json`, "utf8"))),
  );
const payer = wallet("authority"),
  program = wallet("program");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const balance = await connection.getBalance(payer.publicKey);
console.log("Devnet balance lamports:", balance);
if (balance < 1000000000) throw new Error("DEVNET_FUNDING_REQUIRED");
const done = await BpfLoader.load(
  connection,
  payer,
  program,
  readFileSync(".local/orca_orders.so"),
  BPF_LOADER_PROGRAM_ID,
);
if (!done) throw new Error("DEPLOYMENT_FAILED");
const info = await connection.getAccountInfo(program.publicKey);
if (!info?.executable) throw new Error("PROGRAM_NOT_EXECUTABLE");
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
      loader: "BPFLoader2",
      transactions,
      deployedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("Deployed", program.publicKey.toBase58());
