/**
 * Bundle a scripts/*.js entry and run with .env loaded.
 * Usage: node scripts/run-bundled.mjs seed
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const scriptName = process.argv[2];
if (!scriptName) {
  console.error("Usage: node scripts/run-bundled.mjs <script-name-without-ext>");
  process.exit(1);
}

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(backendRoot, "scripts", `${scriptName}.js`);
const outfile = path.join(backendRoot, "dist", `script-${scriptName}.mjs`);

esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  packages: "external",
  logLevel: "silent",
});

const result = spawnSync(
  "node",
  ["--env-file=.env", "--enable-source-maps", outfile],
  { stdio: "inherit", cwd: backendRoot, env: process.env },
);

process.exit(result.status ?? 1);
