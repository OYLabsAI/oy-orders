import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  type Connection,
} from "@solana/web3.js";
import { writeFileSync } from "node:fs";

// Loader-v3 bincode ABI: Write(u32 offset, Vec<u8> bytes). Sequential confirmed
// writes avoid the public RPC burst limit, and compare bytes to resume safely.
export async function writeLoaderBuffer(
  connection: Connection,
  payer: Keypair,
  buffer: Keypair,
  binary: Buffer,
) {
  const loader = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
  let info = await connection.getAccountInfo(buffer.publicKey);
  if (!info) {
    const initialize = new TransactionInstruction({
      programId: loader,
      data: Buffer.alloc(4),
      keys: [
        { pubkey: buffer.publicKey, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: false, isWritable: false },
      ],
    });
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: buffer.publicKey,
          lamports: await connection.getMinimumBalanceForRentExemption(
            binary.length + 37,
          ),
          space: binary.length + 37,
          programId: loader,
        }),
        initialize,
      ),
      [payer, buffer],
      { commitment: "confirmed" },
    );
    info = await connection.getAccountInfo(buffer.publicKey);
  }
  if (
    !info?.owner.equals(loader) ||
    info.data.length !== binary.length + 37 ||
    info.data.readUInt32LE(0) !== 1 ||
    info.data[4] !== 1 ||
    !info.data.subarray(5, 37).equals(payer.publicKey.toBuffer())
  )
    throw new Error("BUFFER_STATE_MISMATCH");
  const chunks: { offset: number; bytes: Buffer }[] = [];
  for (let offset = 0; offset < binary.length; offset += 900) {
    const bytes = binary.subarray(offset, offset + 900);
    if (
      !info.data.subarray(offset + 37, offset + 37 + bytes.length).equals(bytes)
    )
      chunks.push({ offset, bytes });
  }
  console.log(
    `Loader-v3 buffer: ${chunks.length} chunks require confirmed writes.`,
  );
  const signatures: string[] = [];
  for (const [index, { offset, bytes }] of chunks.entries()) {
    // Public Devnet limits individual RPC methods as well as aggregate traffic.
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000));
    const header = Buffer.alloc(16);
    header.writeUInt32LE(1);
    header.writeUInt32LE(offset, 4);
    header.writeBigUInt64LE(BigInt(bytes.length), 8);
    const instruction = new TransactionInstruction({
      programId: loader,
      data: Buffer.concat([header, bytes]),
      keys: [
        { pubkey: buffer.publicKey, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      ],
    });
    signatures.push(
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [payer],
        { commitment: "confirmed" },
      ),
    );
    if ((index + 1) % 5 === 0 || index === chunks.length - 1)
      console.log(`Confirmed buffer writes: ${index + 1}/${chunks.length}`);
  }
  const complete = await connection.getAccountInfo(buffer.publicKey);
  if (!complete?.data.subarray(37).equals(binary))
    throw new Error("BUFFER_BINARY_MISMATCH");
  writeFileSync(
    "docs/evidence/solana-buffer-upload.json",
    JSON.stringify(
      {
        cluster: "devnet",
        buffer: buffer.publicKey.toBase58(),
        bytes: binary.length,
        binaryReadBackVerified: true,
        signatures,
      },
      null,
      2,
    ),
  );
}
