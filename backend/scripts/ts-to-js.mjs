/**
 * One-time migration: transpile all backend .ts sources to .js via esbuild, then remove .ts files.
 * Skips api-zod/generated/types (type-only orval output; removed separately).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";
import * as esbuild from "esbuild";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(backendRoot, "src");
const scriptsRoot = path.join(backendRoot, "scripts");

const STALE_TS = [
  "src/lib/route-errors.ts",
  "src/lib/mongo-list.ts",
  "src/services/bug-format.ts",
  "src/services/company-format.ts",
  "src/services/notification-format.ts",
  "src/services/project-format.ts",
  "src/services/request-format.ts",
  "src/services/ticket-format.ts",
  "src/services/user-format.ts",
  "src/services/company-access.ts",
  "src/services/inventory-access.ts",
  "src/services/access-helpers.ts",
  "src/services/inventory-helpers.ts",
  "src/services/inventory-expiry-job.ts",
];

async function removeStale() {
  for (const rel of STALE_TS) {
    const p = path.join(backendRoot, rel);
    try {
      await fs.unlink(p);
      console.log("removed stale", rel);
    } catch {
      /* already gone */
    }
  }
}

async function removeGeneratedTypes() {
  const typesDir = path.join(srcRoot, "api-zod", "generated", "types");
  await fs.rm(typesDir, { recursive: true, force: true });
  console.log("removed api-zod/generated/types");
}

async function transpileFile(tsPath) {
  const code = await fs.readFile(tsPath, "utf8");
  const { code: js } = await esbuild.transform(code, {
    loader: "ts",
    format: "esm",
    target: "es2022",
  });
  const jsPath = tsPath.replace(/\.ts$/, ".js");
  await fs.writeFile(jsPath, js, "utf8");
  await fs.unlink(tsPath);
}

async function convertTree(rootDir) {
  const files = globSync("**/*.ts", {
    cwd: rootDir,
    exclude: (name) => name.includes("node_modules"),
  }).map((rel) => path.join(rootDir, rel));
  for (const tsPath of files) {
    await transpileFile(tsPath);
    console.log("converted", path.relative(backendRoot, tsPath));
  }
}

async function writeApiZodIndex() {
  const content = `/**
 * Generated Zod schemas from OpenAPI (orval). Type-only exports live in OpenAPI docs — runtime exports below.
 */
export * from "./generated/api.js";

export { AssignBugBody, ListAssignableMembersParams } from "./generated/api.js";
`;
  await fs.writeFile(path.join(srcRoot, "api-zod", "index.js"), content, "utf8");
  try {
    await fs.unlink(path.join(srcRoot, "api-zod", "index.ts"));
  } catch {
    /* ok */
  }
}

async function main() {
  await removeStale();
  await removeGeneratedTypes();

  await convertTree(srcRoot);
  await convertTree(scriptsRoot);

  await writeApiZodIndex();

  console.log("Done. Run: npm run build");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
