import { Runner } from "@chainlink/cre-sdk";
import { initWorkflow } from "./workflow.ts";
import type { Config } from "./workflow.ts";
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
main();
