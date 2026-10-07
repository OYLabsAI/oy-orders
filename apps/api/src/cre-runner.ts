import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.ts";

// The official CLI compiles to a shared workflow path. A single queue prevents
// an audit and a settlement from overwriting each other's build artifacts.
let queue = Promise.resolve();
export function executeCre(id: string, settings: Record<string, unknown>) {
  const pending = queue.then(() => runCre(id, settings));
  queue = pending.then(
    () => {},
    () => {},
  );
  return pending;
}
async function runCre(id: string, settings: Record<string, unknown>) {
  const folder = resolve(config.dataDir, "evidence");
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const configPath = resolve(folder, `${id}-config.json`);
  writeFileSync(configPath, JSON.stringify(settings), { mode: 0o600 });
  const execution = await new Promise<{ output: string; code: number | null }>(
    (done, reject) => {
      const child = spawn(
        resolve(config.creBin),
        [
          "workflow",
          "simulate",
          ".",
          "--project-root",
          config.creDir,
          "--target",
          config.creTarget,
          "--config",
          configPath,
          "--non-interactive",
          "--trigger-index",
          "0",
        ],
        {
          cwd: config.creDir,
          env: {
            ...process.env,
            PATH: `${resolve(config.dataDir, "bin")}:${process.env.PATH}`,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let output = "";
      const timer = setTimeout(() => child.kill("SIGTERM"), 180000);
      child.stdout.on("data", (d) => (output += d.toString()));
      child.stderr.on("data", (d) => (output += d.toString()));
      child.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        done({ output, code });
      });
    },
  );
  const transcript = [
    config.nownodesKey,
    config.blockfrostKey,
    process.env.CRE_API_KEY,
  ]
    .filter((key): key is string => !!key)
    .reduce((log, key) => log.replaceAll(key!, "[REDACTED]"), execution.output);
  writeFileSync(resolve(folder, `${id}-cre.log`), transcript, { mode: 0o600 });
  if (execution.code !== 0) throw new Error("CRE_SIMULATION_FAILED");
  return { output: execution.output, transcript };
}
