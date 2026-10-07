import {
  Keypair,
  PublicKey,
  Connection,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { config } from "./config.ts";
import type { Order } from "../../../packages/core/src/domain.ts";
import { base58 } from "@scure/base";
import { assertSolanaDevnet } from "../../../packages/core/src/networks.ts";
export const connection = new Connection(config.solanaRpc, "confirmed");
export function loadWallet(name: "worker" | "authority" | "demo-buyer") {
  return Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        readFileSync(
          process.env[
            `SOLANA_${name.replaceAll("-", "_").toUpperCase()}_KEYFILE`
          ] ?? resolve(config.dataDir, `${name}.json`),
          "utf8",
        ),
      ),
    ),
  );
}
export function workerAddress() {
  try {
    return loadWallet("worker").publicKey.toBase58();
  } catch {
    return "";
  }
}
const bytes = (hex: string) => Buffer.from(hex, "hex");
const u64 = (value: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(value);
  return b;
};
const nonce = (order: Order) => createHash("sha256").update(order.id).digest();
const sellerHash = (order: Order) =>
  createHash("sha256").update(order.seller).digest();
export function pda(order: Order) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), new PublicKey(order.buyer).toBuffer(), nonce(order)],
    new PublicKey(config.program),
  )[0];
}
function ix(
  order: Order,
  tag: number,
  data: Buffer,
  signer: PublicKey,
  destination?: PublicKey,
) {
  return new TransactionInstruction({
    programId: new PublicKey(config.program),
    data: Buffer.concat([Buffer.from([tag]), data]),
    keys: [
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: pda(order), isSigner: false, isWritable: true },
      {
        pubkey: destination ?? SystemProgram.programId,
        isSigner: false,
        isWritable: !!destination,
      },
    ],
  });
}
export async function fundingTransaction(order: Order) {
  assertSolanaDevnet(await connection.getGenesisHash());
  const instruction = ix(
    order,
    0,
    Buffer.concat([
      nonce(order),
      bytes(order.inputHash),
      sellerHash(order),
      new PublicKey(order.worker).toBuffer(),
      loadWallet("authority").publicKey.toBuffer(),
      u64(BigInt(order.reward)),
      u64(BigInt(Math.floor(order.deadline / 1000))),
      u64(BigInt(order.ceiling)),
    ]),
    new PublicKey(order.buyer),
  );
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: new PublicKey(order.buyer),
    blockhash,
    lastValidBlockHeight,
  }).add(instruction);
  return {
    transaction: tx
      .serialize({ requireAllSignatures: false })
      .toString("base64"),
    lastValidBlockHeight,
    pda: pda(order).toBase58(),
  };
}
export async function observeEscrow(order: Order) {
  assertSolanaDevnet(await connection.getGenesisHash());
  const info = await connection.getAccountInfo(pda(order), "confirmed");
  if (
    !info ||
    !info.owner.equals(new PublicKey(config.program)) ||
    info.data.length !== 328
  )
    throw new Error("ESCROW_NOT_FOUND");
  const d = info.data;
  const equal = (offset: number, expected: Buffer) =>
    d.subarray(offset, offset + 32).equals(expected);
  if (
    d[0] !== 1 ||
    !equal(8, nonce(order)) ||
    !equal(40, new PublicKey(order.buyer).toBuffer()) ||
    !equal(72, new PublicKey(order.worker).toBuffer()) ||
    !equal(104, loadWallet("authority").publicKey.toBuffer()) ||
    !equal(136, bytes(order.inputHash)) ||
    !equal(168, sellerHash(order)) ||
    d.readBigUInt64LE(296) !== BigInt(order.reward) ||
    d.readBigUInt64LE(304) !== BigInt(Math.floor(order.deadline / 1000)) ||
    d.readBigUInt64LE(312) !== BigInt(order.ceiling)
  )
    throw new Error("ESCROW_TERMS_MISMATCH");
  if (
    (d[1] === 0 || d[1] === 1) &&
    BigInt(info.lamports) < BigInt(order.reward)
  )
    throw new Error("ESCROW_UNDERFUNDED");
  return {
    status: d[1],
    quoteHash: d.subarray(200, 232).toString("hex"),
    resultHash: d.subarray(232, 264).toString("hex"),
  };
}
export async function observeFunding(order: Order, signature: string) {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) throw new Error("FUNDING_NOT_CONFIRMED");
  const keys = tx.transaction.message.getAccountKeys();
  const expectedPda = pda(order);
  const funded = tx.transaction.message.compiledInstructions.some(
    (instruction) => {
      const data =
        typeof instruction.data === "string"
          ? base58.decode(instruction.data)
          : instruction.data;
      return (
        keys
          .get(instruction.programIdIndex)
          ?.equals(new PublicKey(config.program)) &&
        data.length === 185 &&
        data[0] === 0 &&
        Buffer.from(data.subarray(1, 33)).equals(nonce(order)) &&
        keys
          .get(instruction.accountKeyIndexes[0])
          ?.equals(new PublicKey(order.buyer)) &&
        keys.get(instruction.accountKeyIndexes[1])?.equals(expectedPda)
      );
    },
  );
  if (!funded) throw new Error("FUNDING_TRANSACTION_MISMATCH");
  return observeEscrow(order);
}
async function submit(
  order: Order,
  tag: number,
  data: Buffer,
  wallet: Keypair,
  destination?: PublicKey,
) {
  assertSolanaDevnet(await connection.getGenesisHash());
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: wallet.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(ix(order, tag, data, wallet.publicKey, destination));
  tx.sign(wallet);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  const confirmed = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (confirmed.value.err) throw new Error("SOLANA_TRANSACTION_FAILED");
  return signature;
}
export function reserve(order: Order) {
  return submit(
    order,
    1,
    Buffer.concat([
      bytes(order.quoteHash!),
      u64(BigInt(order.quote!.amount)),
      sellerHash(order),
      bytes(order.inputHash),
    ]),
    loadWallet("worker"),
  );
}
export function settle(order: Order) {
  return submit(
    order,
    2,
    Buffer.concat([
      bytes(order.quoteHash!),
      bytes(order.receipt!.resultHash),
      bytes(order.receipt!.paymentHash),
    ]),
    loadWallet("authority"),
    new PublicKey(order.worker),
  );
}
export async function refundTransaction(order: Order) {
  const state = await observeEscrow(order);
  if (state.status > 1 || Date.now() < order.deadline)
    throw new Error("REFUND_NOT_AVAILABLE");
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: new PublicKey(order.buyer),
    blockhash,
    lastValidBlockHeight,
  }).add(
    ix(
      order,
      3,
      Buffer.alloc(0),
      new PublicKey(order.buyer),
      new PublicKey(order.buyer),
    ),
  );
  return {
    transaction: tx
      .serialize({ requireAllSignatures: false })
      .toString("base64"),
    lastValidBlockHeight,
  };
}
