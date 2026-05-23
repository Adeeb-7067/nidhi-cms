/**
 * Replace @/ alias imports with relative paths (Node ESM has no @ resolver at runtime).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(backendRoot, "src");

function resolveAliasTarget(spec) {
  const rel = spec.replace(/^@\//, "");
  const base = path.join(srcRoot, rel);
  if (fs.existsSync(`${base}.js`)) return `${base}.js`;
  if (fs.existsSync(path.join(base, "index.js"))) {
    return path.join(base, "index.js");
  }
  return `${base}.js`;
}

function toRelativeImport(fromFile, aliasSpec) {
  const target = resolveAliasTarget(aliasSpec);
  let rel = path.relative(path.dirname(fromFile), target);
  rel = rel.split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const next = content.replace(/(["'])@\/([^"']+)\1/g, (match, quote, spec) => {
    const rel = toRelativeImport(filePath, `@/${spec}`);
    return `${quote}${rel}${quote}`;
  });
  if (next !== content) {
    fs.writeFileSync(filePath, next);
    return true;
  }
  return false;
}

function walk(dir) {
  let count = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) count += walk(p);
    else if (name.endsWith(".js") && processFile(p)) count += 1;
  }
  return count;
}

let updated = 0;
updated += walk(path.join(backendRoot, "src"));
for (const rel of ["index.js", "scripts/seed.js", "scripts/seed-more.js", "scripts/migrate-company-hierarchy.js"]) {
  const p = path.join(backendRoot, rel);
  if (fs.existsSync(p) && processFile(p)) updated += 1;
}
console.log(`Updated ${updated} files`);
