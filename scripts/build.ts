import { build } from "esbuild";
import {
  mkdirSync,
  copyFileSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
mkdirSync("site/dist", { recursive: true });
await build({
  entryPoints: ["apps/web/src/app.ts"],
  bundle: true,
  outfile: "site/dist/app.js",
  format: "esm",
  minify: true,
  target: "es2022",
  define: { __API_URL__: JSON.stringify(process.env.PUBLIC_API_URL ?? "") },
});
for (const file of ["index.html", "style.css"])
  copyFileSync(`apps/web/src/${file}`, `site/dist/${file}`);
const evidence = JSON.parse(
  readFileSync("docs/evidence/live-order.json", "utf8"),
);
const refund = JSON.parse(
  readFileSync("docs/evidence/live-refund.json", "utf8"),
);
if (
  evidence.order.mode !== "live" ||
  evidence.order.status !== "settled" ||
  !evidence.order.verification?.accepted
)
  throw new Error("VERIFIED_DEMO_EVIDENCE_REQUIRED");
writeFileSync("site/dist/proof.json", JSON.stringify({ ...evidence, refund }));
writeFileSync(
  "site/dist/build.json",
  JSON.stringify({ version: "0.1.0", builtAt: new Date().toISOString() }),
);
console.log("Built site/dist");
