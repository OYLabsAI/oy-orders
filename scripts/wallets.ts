import { Keypair } from "@solana/web3.js";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { Address, PrivateKey } from "@evolution-sdk/evolution";
import { addressFromSeed } from "@evolution-sdk/evolution/sdk/wallet/Derivation";
mkdirSync(".local", { recursive: true, mode: 0o700 });
for (const name of ["worker", "authority", "program", "demo-buyer"]) {
  const path = `.local/${name}.json`;
  if (!existsSync(path))
    writeFileSync(
      path,
      JSON.stringify(Array.from(Keypair.generate().secretKey)),
      { mode: 0o600 },
    );
  console.log(
    `${name}: ${Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")))).publicKey}`,
  );
}
for (const name of ["cardano-agent", "cardano-seller"]) {
  const path = `.local/${name}.json`;
  if (!existsSync(path)) {
    const mnemonic = PrivateKey.generateMnemonic();
    const address = Address.toBech32(
      addressFromSeed(mnemonic, { networkId: 0 }).address,
    );
    writeFileSync(path, JSON.stringify({ mnemonic, address }), { mode: 0o600 });
  }
  console.log(`${name}: ${JSON.parse(readFileSync(path, "utf8")).address}`);
}
console.log(
  "Private keys remain in ignored .local files. Testnet wallets only.",
);
