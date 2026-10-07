import { Sandbox, Drive } from "@vercel/sandbox";
import { existsSync, readFileSync, chmodSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { DatabaseSync, backup } from "node:sqlite";
import { resolve } from "node:path";
import { homedir } from "node:os";

// Run from the repository root, after linking the isolated Vercel release.
// Secrets go directly into private cloud files, never the frontend upload.
process.loadEnvFile(".local/vercel-env");
chmodSync(".local/vercel-env", 0o600);
const drive = await Drive.getOrCreate({
  name: "oy-orders-data",
  maxSize: 1024 ** 3,
});
const sandbox = await Sandbox.getOrCreate({
  name: "oy-orders-backend",
  runtime: "node24",
  ports: [8787],
  timeout: 45 * 60 * 1000,
  resources: { vcpus: 1 },
  persistent: true,
  keepLastSnapshots: { count: 2, deleteEvicted: false },
  mounts: { "/data": drive },
  resume: true,
});
const root = "/vercel/sandbox/oy-orders";
const git = process.env.GIT_BIN ?? "git";
const files = execFileSync(
  git,
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter((file) =>
    /^(apps\/api\/|packages\/core\/|workflows\/verify-order\/|hosting\/vercel\/|package\.json$|pnpm-lock\.yaml$|LICENSE$|tsconfig\.json$|pnpm-workspace\.yaml$)/.test(
      file,
    ),
  );
for (const file of [
  "hosting/vercel/start-backend.sh",
  "hosting/vercel/api/backend.mjs",
  "hosting/vercel/install-runtime.sh",
])
  if (!files.includes(file)) files.push(file);
await sandbox.writeFiles(
  files.map((file) => ({
    path: `${root}/${file}`,
    content: readFileSync(file),
    mode: 0o644,
  })),
);
async function command(cmd: string, args: string[], cwd = root) {
  const result = await sandbox.runCommand({ cmd, args, cwd });
  if (result.exitCode !== 0) throw new Error(`CLOUD_SETUP_FAILED: ${cmd}`);
  return result;
}
await command("bash", [
  "-c",
  "mkdir -p /data/bin && chmod 700 /data && ln -sfn /data .local",
]);
const ownership = await sandbox.runCommand({
  cmd: "chown",
  args: ["-R", "vercel-sandbox:vercel-sandbox", "/data"],
  sudo: true,
});
if (ownership.exitCode !== 0) throw Error("DATA_OWNER_FAILED");
const initialized = await sandbox.runCommand({
  cmd: "test",
  args: ["-f", "/data/seeded"],
  cwd: root,
});
if (initialized.exitCode !== 0) {
  const localDatabase = new DatabaseSync(resolve(".local/orders.sqlite"));
  await backup(localDatabase, resolve(".local/sandbox-orders.sqlite"));
  localDatabase.close();
  const privateFiles = [
    "authority.json",
    "worker.json",
    "cardano-agent.json",
    "seller-signing.pem",
  ];
  for (const file of privateFiles)
    if (!existsSync(`.local/${file}`))
      throw new Error(`MISSING_PRIVATE_RUNTIME_FILE: ${file}`);
  await sandbox.writeFiles([
    ...privateFiles.map((file) => ({
      path: `/data/${file}`,
      content: readFileSync(`.local/${file}`),
      mode: 0o600,
    })),
    {
      path: "/data/orders.sqlite",
      content: readFileSync(".local/sandbox-orders.sqlite"),
      mode: 0o600,
    },
    {
      path: "/data/seeded",
      content: "Existing testnet order history copied once.\n",
      mode: 0o600,
    },
  ]);
}
const { parseEnv } = await import("node:util");
const original = parseEnv(readFileSync(".env", "utf8"));
const runtimeEnv = {
  ...original,
  HOST: "0.0.0.0",
  PORT: "8787",
  MODE: "live",
  DATA_DIR: "/data",
  PUBLIC_API_URL: "https://oy-orders.vercel.app",
  CORS_ORIGIN:
    "https://oy-orders.vercel.app,https://orca-orders-origins-2026.orcabay.chatgpt.site",
  CRE_BIN: "/data/bin/cre",
  SOLANA_AUTHORITY_KEYFILE: "/data/authority.json",
  SOLANA_WORKER_KEYFILE: "/data/worker.json",
  CRE_WORKFLOW_DIR: `${root}/workflows/verify-order`,
};
await sandbox.writeFiles([
  {
    path: `${root}/.env`,
    content: Object.entries(runtimeEnv)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n"),
    mode: 0o600,
  },
]);
await command("npx", [
  "--yes",
  "pnpm@11.19.0",
  "install",
  "--frozen-lockfile",
  "--ignore-scripts",
]);
await command("bash", ["hosting/vercel/install-runtime.sh"]);
// Existing CRE login is copied only into private runtime storage when no API
// key is provided. Credential values never appear in the release or logs.
if (!original.CRE_API_KEY) {
  const homeResult = await command("node", [
    "-e",
    'console.log(require("os").homedir())',
  ]);
  const remoteHome = (await homeResult.stdout()).trim();
  if (!remoteHome.startsWith("/home/")) throw Error("UNEXPECTED_RUNTIME_HOME");
  await command("bash", [
    "-c",
    `mkdir -p /data/cre-auth; chmod 700 /data/cre-auth; if [ ! -L ${remoteHome}/.cre ]; then mv ${remoteHome}/.cre ${remoteHome}/.cre-previous 2>/dev/null || true; ln -s /data/cre-auth ${remoteHome}/.cre; fi`,
  ]);
  // Never replace a refreshed cloud login on subsequent source deployments.
  const loggedIn = await sandbox.runCommand({
    cmd: "test",
    args: ["-f", "/data/cre-auth/cre.yaml"],
  });
  if (loggedIn.exitCode !== 0)
    await sandbox.writeFiles(
      ["cre.yaml", "context.yaml"].map((file) => ({
        path: `/data/cre-auth/${file}`,
        content: readFileSync(resolve(homedir(), ".cre", file)),
        mode: 0o600,
      })),
    );
}
await command("bash", ["hosting/vercel/start-backend.sh"]);
const info = {
  name: sandbox.name,
  origin: sandbox.domain(8787),
  configuredAt: new Date().toISOString(),
  data: "persistent Vercel Drive",
  creKeyPresent: !!original.CRE_API_KEY,
};
writeFileSync(".local/vercel-backend.json", JSON.stringify(info, null, 2), {
  mode: 0o600,
});
console.log(JSON.stringify(info));
