import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { Keypair, PublicKey } from "@solana/web3.js";
import { hash, signReceipt } from "../../packages/core/src/domain.ts";
import { expectedPda, verifyRemote } from "./workflow.ts";
import { SOLANA_DEVNET_GENESIS } from "../../packages/core/src/networks.ts";
function fixture() {
  const pair = generateKeyPairSync("ed25519"),
    buyer = Keypair.generate().publicKey.toBase58(),
    worker = Keypair.generate().publicKey.toBase58(),
    authority = Keypair.generate().publicKey.toBase58(),
    programId = Keypair.generate().publicKey.toBase58();
  const input = {
    solanaWallet: buyer,
    cardanoWallet: "addr1q" + "a".repeat(97),
    scenario: "success",
  };
  const o = {
    id: randomUUID(),
    mode: "live",
    status: "verifying",
    createdAt: 1000,
    deadline: 1000000,
    input,
    inputHash: hash({
      solanaWallet: input.solanaWallet,
      cardanoWallet: input.cardanoWallet,
    }),
    reward: "10000000",
    ceiling: "2000000",
    feeCeiling: "1000000",
    buyer,
    worker,
    seller: "addr_test1seller",
    sellerKey: pair.publicKey
      .export({ type: "spki", format: "pem" })
      .toString(),
  };
  o.quote = {
    orderId: o.id,
    network: "cardano:preprod",
    asset: "lovelace",
    amount: "2000000",
    recipient: o.seller,
    expiresAt: o.deadline,
    resource: "https://fixture.invalid/paid/report",
  };
  o.quoteHash = hash(o.quote);
  o.report = {
    inputHash: o.inputHash,
    solanaWallet: input.solanaWallet,
    cardanoWallet: input.cardanoWallet,
    facts: [
      {
        network: "solana:mainnet",
        wallet: buyer,
        tx: "sol-tx",
        slot: "99",
        fee: "5000",
        confirmed: true,
      },
      {
        network: "cardano:mainnet",
        wallet: input.cardanoWallet,
        tx: "ada-tx",
        slot: "88",
        fee: "170000",
        confirmed: true,
      },
    ],
  };
  o.receipt = signReceipt(
    {
      orderId: o.id,
      quoteHash: o.quoteHash,
      paymentHash: "b".repeat(64),
      recipient: o.seller,
      network: "cardano:preprod",
      asset: "lovelace",
      amount: "2000000",
      resultHash: hash(o.report),
    },
    pair.privateKey,
  );
  const c = {
    orderId: o.id,
    apiUrl: "https://fixture.invalid",
    solanaRpc: "https://devnet.fixture.invalid",
    programId,
    sellerKey: o.sellerKey,
    worker,
    authority,
    blockfrostKey: "unit-test-key",
    nownodesKey: "unit-test-key",
    now: 2000,
  };
  o.solana = { pda: expectedPda(o, programId) };
  const raw = (s) => Buffer.from(s, "utf8");
  const digest = (s) => {
    return import("node:crypto").then((m) =>
      m.createHash("sha256").update(s).digest(),
    );
  };
  const d = Buffer.alloc(328);
  d[0] = 1;
  d[1] = 1;
  return { pair, o, c, d, digest, raw };
}
async function harness() {
  const f = fixture(),
    { o, c, d, digest } = f;
  (await digest(o.id)).copy(d, 8);
  new PublicKey(o.buyer).toBuffer().copy(d, 40);
  new PublicKey(o.worker).toBuffer().copy(d, 72);
  new PublicKey(c.authority).toBuffer().copy(d, 104);
  Buffer.from(o.inputHash, "hex").copy(d, 136);
  (await digest(o.seller)).copy(d, 168);
  Buffer.from(o.quoteHash, "hex").copy(d, 200);
  d.writeBigUInt64LE(10000000n, 296);
  d.writeBigUInt64LE(1000n, 304);
  d.writeBigUInt64LE(2000000n, 312);
  d.writeBigUInt64LE(2000000n, 320);
  let owner = c.programId,
    recipient = o.seller,
    networkMagic = 1,
    solanaGenesis = SOLANA_DEVNET_GENESIS;
  const send = {
    sendRequest(request) {
      return {
        result() {
          let value;
          const url = request.url;
          const body = request.body
            ? JSON.parse(Buffer.from(request.body, "base64"))
            : null;
          if (url.startsWith(c.apiUrl)) value = o;
          else if (url.endsWith("/genesis"))
            value = { network_magic: networkMagic };
          else if (body?.method === "getGenesisHash")
            value = { result: solanaGenesis };
          else if (body?.method === "getAccountInfo")
            value = {
              result: {
                value: {
                  owner,
                  lamports: 20000000,
                  data: [d.toString("base64"), "base64"],
                },
              },
            };
          else if (body?.method === "getSignaturesForAddress")
            value = { result: [{ signature: "sol-tx", err: null }] };
          else if (body?.method === "getTransaction")
            value = { result: { slot: 99, meta: { fee: 5000, err: null } } };
          else if (url.includes("preprod.koios.rest")) {
            assert.deepEqual(body._tx_hashes, [o.receipt.paymentHash]);
            value = [
              {
                tx_hash: o.receipt.paymentHash,
                block_hash: "confirmed-block",
                fee: "170000",
                outputs: [
                  { payment_addr: { bech32: recipient }, value: "2000000" },
                ],
              },
            ];
          } else if (url.includes("/utxos"))
            value = {
              hash: o.receipt.paymentHash,
              outputs: [
                {
                  address: recipient,
                  amount: [{ unit: "lovelace", quantity: "2000000" }],
                },
              ],
            };
          else if (
            url.includes("preprod.blockfrost") ||
            url.includes("ada-testnet.nownodes.io")
          )
            value = {
              hash: o.receipt.paymentHash,
              fees: "170000",
              block: "confirmed-block",
            };
          else if (url.includes("/addresses/")) value = [{ tx_hash: "ada-tx" }];
          else if (url.includes("/txs/"))
            value = { slot: 88, fees: "170000", block: "source-block" };
          else throw new Error("Unmocked source");
          return { statusCode: 200, body: Buffer.from(JSON.stringify(value)) };
        },
      };
    },
  };
  return {
    ...f,
    send,
    setOwner: (v) => {
      owner = v;
    },
    setRecipient: (v) => {
      recipient = v;
    },
    setNetworkMagic: (v) => {
      networkMagic = v;
    },
    setSolanaGenesis: (v) => {
      solanaGenesis = v;
    },
  };
}
test("CRE verifier derives the same order PDA as Solana and checks every remote source", async () => {
  const f = await harness();
  const nonce = await f.digest(f.o.id);
  const p = PublicKey.findProgramAddressSync(
    [Buffer.from("order"), new PublicKey(f.o.buyer).toBuffer(), nonce],
    new PublicKey(f.c.programId),
  )[0].toBase58();
  assert.equal(f.o.solana.pda, p);
  const result = JSON.parse(verifyRemote(f.send, f.c));
  assert.equal(result.accepted, true);
  assert.equal(result.mode, "cre-simulation");
  assert.equal(result.checks.length, 10);
});
test("CRE verifier rejects counterfeit escrow ownership or reservation", async () => {
  const f = await harness();
  f.setOwner(Keypair.generate().publicKey.toBase58());
  assert.throws(() => verifyRemote(f.send, f.c), /OWNER_MISMATCH/);
  f.setOwner(f.c.programId);
  f.d[200] ^= 1;
  assert.throws(() => verifyRemote(f.send, f.c), /TERMS_MISMATCH/);
});
test("CRE verifier rejects changed report, seller key and payment recipient", async () => {
  let f = await harness();
  f.o.report.facts[0].fee = "6";
  assert.equal(JSON.parse(verifyRemote(f.send, f.c)).accepted, false);
  f = await harness();
  f.o.sellerKey = "attacker";
  assert.throws(() => verifyRemote(f.send, f.c), /ORDER_MISMATCH/);
  f = await harness();
  f.setRecipient("other");
  assert.equal(JSON.parse(verifyRemote(f.send, f.c)).accepted, false);
});
test("CRE independently verifies Koios payment without a Blockfrost key", async () => {
  const f = await harness();
  f.c.blockfrostKey = "";
  assert.equal(JSON.parse(verifyRemote(f.send, f.c)).accepted, true);
  f.setRecipient("other");
  assert.equal(JSON.parse(verifyRemote(f.send, f.c)).accepted, false);
});
test("CRE independently reads NOWNodes preprod proof and rejects a wrong Cardano network", async () => {
  const f = await harness();
  f.c.paymentProvider = "nownodes";
  f.c.blockfrostKey = "";
  assert.equal(JSON.parse(verifyRemote(f.send, f.c)).accepted, true);
  f.setNetworkMagic(2);
  assert.throws(() => verifyRemote(f.send, f.c), /NETWORK_MISMATCH/);
});
test("CRE rejects Solana Testnet even when escrow data otherwise matches", async () => {
  const f = await harness();
  f.setSolanaGenesis("4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY");
  assert.throws(() => verifyRemote(f.send, f.c), /SOLANA_NETWORK_MISMATCH/);
});
