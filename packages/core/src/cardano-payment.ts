import type { Payment } from "./types.ts";

export const KOIOS_PREPROD = "https://preprod.koios.rest/api/v1";
export const NOWNODES_PREPROD = "https://ada-testnet.nownodes.io";
export function assertPreprodGenesis(data: unknown) {
  if ((data as { network_magic?: number } | null)?.network_magic !== 1)
    throw new Error("CARDANO_NETWORK_MISMATCH");
}
export const koiosPaymentRequest = (tx: string) => ({
  _tx_hashes: [tx],
  _inputs: false,
  _metadata: false,
  _assets: false,
  _withdrawals: false,
  _certs: false,
  _scripts: false,
  _bytecode: false,
});

type KoiosTransaction = {
  tx_hash: string;
  block_hash: string;
  fee: string;
  outputs: { payment_addr: { bech32: string }; value: string }[];
};

// Historical transaction outputs remain available after the UTxOs are spent.
// Never substitute address balance or current UTxOs for proof of a payment.
export function koiosPayment(
  tx: string,
  recipient: string,
  data: unknown,
): Payment {
  if (!Array.isArray(data) || data.length === 0)
    throw new Error("PAYMENT_NOT_CONFIRMED");
  const info = data[0] as KoiosTransaction;
  if (data.length !== 1 || info.tx_hash !== tx)
    throw new Error("PAYMENT_HASH_MISMATCH");
  if (!info.block_hash) throw new Error("PAYMENT_NOT_CONFIRMED");
  if (!/^[0-9]+$/.test(info.fee) || !Array.isArray(info.outputs))
    throw new Error("INVALID_PAYMENT_SOURCE");
  let amount = 0n;
  for (const output of info.outputs) {
    if (!/^[0-9]+$/.test(output.value))
      throw new Error("INVALID_PAYMENT_SOURCE");
    if (output.payment_addr?.bech32 === recipient)
      amount += BigInt(output.value);
  }
  return {
    tx,
    recipient,
    amount: amount.toString(),
    fee: info.fee,
    network: "cardano:preprod",
    asset: "lovelace",
    confirmed: true,
  };
}

// Blockfrost-compatible historical outputs. Check BOTH response hashes;
// a valid_contract=false transaction did not apply its advertised outputs.
export function blockfrostPayment(
  tx: string,
  recipient: string,
  info: any,
  utxos: any,
): Payment {
  if (!info?.block || !utxos) throw new Error("PAYMENT_NOT_CONFIRMED");
  if (info.hash !== tx || utxos.hash !== tx)
    throw new Error("PAYMENT_HASH_MISMATCH");
  if (
    info.valid_contract === false ||
    !/^[0-9]+$/.test(info.fees) ||
    !Array.isArray(utxos.outputs)
  )
    throw new Error("INVALID_PAYMENT_SOURCE");
  let amount = 0n;
  for (const output of utxos.outputs) {
    if (!Array.isArray(output.amount))
      throw new Error("INVALID_PAYMENT_SOURCE");
    for (const asset of output.amount) {
      if (!/^[0-9]+$/.test(asset.quantity))
        throw new Error("INVALID_PAYMENT_SOURCE");
      if (output.address === recipient && asset.unit === "lovelace")
        amount += BigInt(asset.quantity);
    }
  }
  return {
    tx,
    recipient,
    amount: amount.toString(),
    fee: info.fees,
    network: "cardano:preprod",
    asset: "lovelace",
    confirmed: true,
  };
}
