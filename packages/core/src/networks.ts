export const SOLANA_DEVNET_GENESIS =
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export function assertSolanaDevnet(genesis: unknown) {
  if (genesis !== SOLANA_DEVNET_GENESIS)
    throw new Error("SOLANA_NETWORK_MISMATCH");
}
