/**
 * Add .js extensions to relative imports (required for unbundled Node ESM).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveRelative(fromDir, spec) {
  if (spec.endsWith(".js")) return spec;
  const abs = path.resolve(fromDir, spec);
  if (fs.existsSync(`${abs}.js`)) {
    let rel = path.relative(fromDir, `${abs}.js`);
    rel = rel.split(path.sep).join("/");
    return rel.startsWith(".") ? rel : `./${rel}`;
  }
  if (fs.existsSync(path.join(abs, "index.js"))) {
    let rel = path.relative(fromDir, path.join(abs, "index.js"));
    rel = rel.split(path.sep).join("/");
    return rel.startsWith(".") ? rel : `./${rel}`;
  }
  return null;
}

function fixFile(filePath) {
  const dir = path.dirname(filePath);
  let content = fs.readFileSync(filePath, "utf8");
  const next = content.replace(
    /from (["'])(\.\.?\/[^"']+)\1/g,
    (match, quote, spec) => {
      const fixed = resolveRelative(dir, spec);
      return fixed ? `from ${quote}${fixed}${quote}` : match;
    },
  ).replace(
    /^import (["'])(\.\.?\/[^"']+)\1;?\s*$/gm,
    (match, quote, spec) => {
      const fixed = resolveRelative(dir, spec);
      return fixed ? `import ${quote}${fixed}${quote};` : match;
    },
  );
  if (next !== content) {
    fs.writeFileSync(filePath, next);
    return true;
  }
  return false;
}

function walk(dir) {
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) n += walk(p);
    else if (name.endsWith(".js") && fixFile(p)) n += 1;
  }
  return n;
}

let count = walk(path.join(backendRoot, "src"));
for (const rel of ["index.js", "load-env.js"]) {
  const p = path.join(backendRoot, rel);
  if (fs.existsSync(p) && fixFile(p)) count += 1;
}
console.log(`Fixed extensions in ${count} files`);
