import { build } from "esbuild";
import { mkdirSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
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
writeFileSync(
  "site/dist/build.json",
  JSON.stringify({ version: "0.1.0", builtAt: new Date().toISOString() }),
);
console.log("Built site/dist");
