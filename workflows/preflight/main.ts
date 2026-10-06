import {
  Runner,
  cre,
  consensusIdenticalAggregation,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";

// A setup check using real CRE HTTP execution. This does not verify an order,
// a payment, escrow or NOWNodes integration and cannot authorize settlement.
function readNetworks(send: HTTPSendRequester): string {
  const read = (url: string, body?: unknown) => {
    const response = send
      .sendRequest({
        url,
        method: body ? "POST" : "GET",
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: Buffer.from(JSON.stringify(body)).toString("base64"),
            }
          : {}),
      })
      .result();
    if (response.statusCode !== 200)
      throw new Error(`PREFLIGHT_HTTP_${response.statusCode}`);
    return JSON.parse(Buffer.from(response.body).toString("utf8"));
  };
  const solana = read("https://api.devnet.solana.com", {
    jsonrpc: "2.0",
    id: 1,
    method: "getGenesisHash",
    params: [],
  });
  const cardano = read(
    "https://preprod.koios.rest/api/v1/genesis?select=networkmagic,networkid,systemstart",
  )[0];
  if (
    solana.error ||
    solana.result !== "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" ||
    cardano?.networkmagic !== "1" ||
    cardano?.networkid !== "Testnet"
  )
    throw new Error(
      `PREFLIGHT_WRONG_NETWORK:${JSON.stringify({ solana, cardano })}`,
    );
  return JSON.stringify({
    check: "network-connectivity-only",
    solana: { network: "devnet", genesisHash: solana.result },
    cardano: {
      network: "preprod",
      networkMagic: cardano.networkmagic,
      systemStart: cardano.systemstart,
    },
  });
}
function onTrigger(runtime: Runtime<Record<string, never>>) {
  const result = new cre.capabilities.HTTPClient()
    .sendRequest(runtime, readNetworks, consensusIdenticalAggregation<string>())(
      {},
    )
    .result();
  runtime.log(`ORCA_PREFLIGHT:${result}`);
  return result;
}
export async function main() {
  const runner = await Runner.newRunner<Record<string, never>>();
  await runner.run(() => [
    cre.handler(
      new cre.capabilities.CronCapability().trigger({
        schedule: "0 * * * * *",
      }),
      onTrigger,
    ),
  ]);
}
main();
