import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "../apps/api/src/config.ts";
const result = spawnSync(
  resolve(config.creBin),
  [
    "workflow",
    "simulate",
    ".",
    "--project-root",
    "workflows/preflight",
    "--target",
    "staging-settings",
    "--non-interactive",
    "--trigger-index",
    "0",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `${resolve(".local/bin")}:${process.env.PATH}`,
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
