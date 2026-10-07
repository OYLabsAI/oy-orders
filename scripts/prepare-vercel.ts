import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

// Build an isolated upload directory. Never deploy the repository root: it
// contains ignored credentials, wallet files and the local payment database.
const apiArgument = process.argv.find((argument) =>
  argument.startsWith("--api-origin="),
);
const apiOrigin = apiArgument?.slice("--api-origin=".length);
const sandboxBackend = process.argv.includes("--sandbox");
const appOnly = process.argv.includes("--app-only");
if (sandboxBackend && apiOrigin) throw Error("CHOOSE_ONE_BACKEND");
if (apiOrigin) {
  const url = new URL(apiOrigin);
  if (
    url.protocol !== "https:" ||
    url.origin !== apiOrigin ||
    url.username ||
    url.password
  )
    throw new Error("API_ORIGIN_MUST_BE_AN_HTTPS_ORIGIN");
}
process.env.PUBLIC_API_URL = ""; // Same-origin routes, or saved proof without an API.
await import("./build.ts");
const release = resolve(".local/vercel-release");
const files = ["index.html", "style.css", "app.js", "proof.json", "build.json"];
const downloads = [
  "OY-Orders-demo.mp4",
  "OY-Orders-pitch.pptx",
  "OY-Orders-pitch.ppt",
  "OY-Orders-proof-and-refund.jpg",
  "OY-Orders-source.zip",
];
const oldDownloads = downloads.map((file) =>
  file.replace("OY-Orders", "Orca-Orders"),
);
const allowed = new Set([
  ...files,
  "vercel.json",
  "hosting.json",
  ".gitignore",
  ".vercelignore",
  "deliverables/index.html",
  "downloads/manifest.json",
  ...downloads.map((file) => `downloads/${file}`),
  ...oldDownloads.map((file) => `downloads/${file}`),
  "package.json",
  "pnpm-lock.yaml",
  "api/backend.mjs",
]);
function checkDirectory(relative = "") {
  if (!existsSync(`${release}/${relative}`)) return;
  for (const entry of readdirSync(`${release}/${relative}`)) {
    const file = relative ? `${relative}/${entry}` : entry;
    const info = lstatSync(`${release}/${file}`);
    if (info.isSymbolicLink())
      throw new Error(`UPLOAD_SYMLINK_REJECTED: ${file}`);
    if (file === ".vercel" || file === ".env.local") continue; // CLI metadata, excluded below.
    if (info.isDirectory()) checkDirectory(file);
    else if (!allowed.has(file))
      throw new Error(`UNEXPECTED_UPLOAD_FILE: ${file}`);
  }
}
checkDirectory();
mkdirSync(`${release}/downloads`, { recursive: true });
mkdirSync(`${release}/deliverables`, { recursive: true });
for (const file of files)
  copyFileSync(`site/dist/${file}`, `${release}/${file}`);
const manifest = appOnly
  ? []
  : downloads.map((file) => {
      const bytes = readFileSync(`output/${file}`);
      copyFileSync(`output/${file}`, `${release}/downloads/${file}`);
      return {
        file,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    });
if (!appOnly)
  writeFileSync(
    `${release}/downloads/manifest.json`,
    JSON.stringify(manifest, null, 2),
  );
const routes = ["/health", "/api/:path*", "/paid/:path*"];
if (sandboxBackend) {
  mkdirSync(`${release}/api`, { recursive: true });
  copyFileSync("hosting/vercel/api/backend.mjs", `${release}/api/backend.mjs`);
  for (const file of ["package.json", "pnpm-lock.yaml"])
    copyFileSync(`.local/vercel-runtime/${file}`, `${release}/${file}`);
}
writeFileSync(
  `${release}/vercel.json`,
  JSON.stringify(
    {
      $schema: "https://openapi.vercel.sh/vercel.json",
      framework: null,
      buildCommand: null,
      installCommand: sandboxBackend
        ? "pnpm install --frozen-lockfile --ignore-scripts"
        : null,
      ...(sandboxBackend
        ? { functions: { "api/backend.mjs": { maxDuration: 300 } } }
        : {}),
      headers: [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "no-referrer" },
            { key: "X-Frame-Options", value: "DENY" },
          ],
        },
        ...routes.map((source) => ({
          source,
          headers: [{ key: "Cache-Control", value: "no-store" }],
        })),
      ],
      rewrites: sandboxBackend
        ? [
            { source: "/health", destination: "/api/backend?path=health" },
            {
              source: "/api/:path*",
              destination: "/api/backend?path=api/:path*",
            },
            {
              source: "/paid/:path*",
              destination: "/api/backend?path=paid/:path*",
            },
          ]
        : apiOrigin
          ? routes.map((source) => ({
              source,
              destination: `${apiOrigin}${source}`,
            }))
          : [],
    },
    null,
    2,
  ),
);
if (!appOnly)
  writeFileSync(
    `${release}/deliverables/index.html`,
    `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OY Orders · Demo and pitch</title><link rel="stylesheet" href="/style.css">
<main style="max-width:960px;margin:40px auto;padding:24px"><a href="/">← Open OY Orders</a>
<p class="eyebrow" style="margin-top:32px">ORCA LABS · TOKEN2049 ORIGINS</p><h1>A task. A budget.<br>A verifiable result.</h1>
<p>Genuine paid testnet orders, a signed false report rejected, and its task reward refunded. Try the live claim challenge inside the app.</p>
<video controls preload="metadata" playsinline style="width:100%;border-radius:16px;margin:24px 0" poster="/downloads/OY-Orders-proof-and-refund.jpg" src="/downloads/OY-Orders-demo.mp4"></video>
<p>The narrated edited proof tour uses authentic screenshots and synthetic speech. It replays real testnet evidence; it is not a continuous recording of execution.</p>
<p><a href="/downloads/OY-Orders-pitch.pptx" download>Download pitch with embedded video (.pptx)</a></p>
<p><a href="/downloads/OY-Orders-demo.mp4" download>Download demo video (.mp4)</a></p>
<p><a href="/downloads/OY-Orders-source.zip" download>Download MIT source and evidence (.zip)</a></p>
<p><a href="/downloads/OY-Orders-pitch.ppt" download>Download visual backup (.ppt)</a> · Legacy export drops the movie; stage acceptance of PPTX remains unverified.</p>
<p>${sandboxBackend ? "The backend runs in a persistent Vercel Sandbox, with private state on Vercel Drive. Hobby sessions resume on request; cold starts and free-quota limits apply." : apiOrigin ? "Fresh purchases use an external API proxy dependent on the operator’s machine." : "Fresh purchases require a live backend."}</p>
<p>Chainlink evidence uses official local CRE simulation and a trusted demo relayer. No DON deployment or atomic bridge is claimed.</p>
</main></html>`,
  );
writeFileSync(`${release}/.vercelignore`, ".vercel\n.git\n.env*\n*.pem\n");
writeFileSync(
  `${release}/hosting.json`,
  JSON.stringify(
    {
      provider: "vercel",
      backend: sandboxBackend
        ? "vercel-sandbox"
        : apiOrigin
          ? "external-proxy"
          : "not-deployed",
      apiOrigin: apiOrigin ?? null,
      savedProof: true,
      preparedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
if (!appOnly)
  for (const file of oldDownloads)
    if (existsSync(`${release}/downloads/${file}`))
      unlinkSync(`${release}/downloads/${file}`);
checkDirectory();
console.log(
  `Prepared ${release}: saved proof, ${downloads.length} downloads, ${sandboxBackend ? "persistent Vercel backend" : apiOrigin ? "external live API proxy" : "no live API"}.`,
);
