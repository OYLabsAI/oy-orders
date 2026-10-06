import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

// Build an isolated upload directory. Never deploy the repository root: it
// contains ignored credentials, wallet files and the local payment database.
const apiArgument = process.argv.find((argument) =>
  argument.startsWith("--api-origin="),
);
const apiOrigin = apiArgument?.slice("--api-origin=".length);
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
  "Orca-Orders-demo.mp4",
  "Orca-Orders-pitch.pptx",
  "Orca-Orders-pitch.ppt",
  "Orca-Orders-proof-and-refund.jpg",
  "Orca-Orders-source.zip",
];
const allowed = new Set([
  ...files,
  "vercel.json",
  "hosting.json",
  ".gitignore",
  ".vercelignore",
  "deliverables/index.html",
  "downloads/manifest.json",
  ...downloads.map((file) => `downloads/${file}`),
]);
function checkDirectory(relative = "") {
  if (!existsSync(`${release}/${relative}`)) return;
  for (const entry of readdirSync(`${release}/${relative}`)) {
    const file = relative ? `${relative}/${entry}` : entry;
    const info = lstatSync(`${release}/${file}`);
    if (info.isSymbolicLink())
      throw new Error(`UPLOAD_SYMLINK_REJECTED: ${file}`);
    if (file === ".vercel") continue; // CLI metadata, explicitly excluded below.
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
const manifest = downloads.map((file) => {
  const bytes = readFileSync(`output/${file}`);
  copyFileSync(`output/${file}`, `${release}/downloads/${file}`);
  return {
    file,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
});
writeFileSync(
  `${release}/downloads/manifest.json`,
  JSON.stringify(manifest, null, 2),
);
const routes = ["/health", "/api/:path*", "/paid/:path*"];
writeFileSync(
  `${release}/vercel.json`,
  JSON.stringify(
    {
      $schema: "https://openapi.vercel.sh/vercel.json",
      framework: null,
      buildCommand: null,
      installCommand: null,
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
      rewrites: apiOrigin
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
writeFileSync(
  `${release}/deliverables/index.html`,
  `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orca Orders · Demo and pitch</title><link rel="stylesheet" href="/style.css">
<main style="max-width:960px;margin:40px auto;padding:24px"><a href="/">← Open Orca Orders</a>
<p class="eyebrow" style="margin-top:32px">ORCA LABS · TOKEN2049 ORIGINS</p><h1>A task. A budget.<br>A verifiable result.</h1>
<p>Four genuine paid testnet orders, verified receipts, and a confirmed expiry refund. Explore the saved proof inside the app.</p>
<video controls preload="metadata" playsinline style="width:100%;border-radius:16px;margin:24px 0" poster="/downloads/Orca-Orders-proof-and-refund.jpg" src="/downloads/Orca-Orders-demo.mp4"></video>
<p>The 48-second edited proof tour uses authentic screenshots from an earlier testnet run and a clearly labeled local tamper replay.</p>
<p><a href="/downloads/Orca-Orders-pitch.pptx" download>Download pitch with embedded video (.pptx)</a></p>
<p><a href="/downloads/Orca-Orders-demo.mp4" download>Download demo video (.mp4)</a></p>
<p><a href="/downloads/Orca-Orders-source.zip" download>Download MIT source and evidence (.zip)</a></p>
<p><a href="/downloads/Orca-Orders-pitch.ppt" download>Download visual backup (.ppt)</a> · Legacy export drops the movie; stage acceptance of PPTX remains unverified.</p>
<p>${apiOrigin ? "Fresh purchases use the existing live testnet backend through a proxy. That backend currently depends on the operator’s machine." : "This deployment serves saved proof and the demo assets. Fresh purchases require the live backend."}</p>
<p>Chainlink evidence uses official local CRE simulation and a trusted demo relayer. No DON deployment or atomic bridge is claimed.</p>
</main></html>`,
);
writeFileSync(`${release}/.vercelignore`, ".vercel\n.git\n.env*\n*.pem\n");
writeFileSync(
  `${release}/hosting.json`,
  JSON.stringify(
    {
      provider: "vercel",
      backend: apiOrigin ? "external-proxy" : "not-deployed",
      apiOrigin: apiOrigin ?? null,
      savedProof: true,
      preparedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(
  `Prepared ${release}: saved proof, ${downloads.length} downloads, ${apiOrigin ? "external live API proxy" : "no live API"}.`,
);
