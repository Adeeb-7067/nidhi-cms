/**
 * Static audit: catch "X is not defined" ReferenceErrors from missing imports.
 * Run: npm run audit:imports
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src");
const SCAN_DIRS = ["middlewares", "mappers", "modules", "routes"];

const EXPORT_ROOTS = ["lib", "utils", "constants", "mappers", "modules"];

const BUILTINS = new Set([
  "Array",
  "Boolean",
  "Date",
  "Error",
  "JSON",
  "Math",
  "Number",
  "Object",
  "Promise",
  "Proxy",
  "Reflect",
  "RegExp",
  "Set",
  "String",
  "Symbol",
  "URL",
  "URLSearchParams",
  "console",
  "parseFloat",
  "parseInt",
  "isFinite",
  "isNaN",
  "decodeURIComponent",
  "encodeURIComponent",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "Buffer",
  "process",
  "fetch",
  "Response",
  "Request",
  "Headers",
  "AbortController",
  "structuredClone",
]);

const IGNORE_IDENTIFIERS = new Set([
  "require",
  "module",
  "exports",
  "undefined",
  "null",
  "true",
  "false",
  "NaN",
  "Infinity",
  "arguments",
  "async",
  "await",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "new",
  "typeof",
  "instanceof",
  "in",
  "of",
  "delete",
  "void",
  "this",
  "super",
  "import",
  "export",
  "from",
  "default",
  "as",
  "const",
  "let",
  "var",
  "class",
  "extends",
  "static",
  "get",
  "set",
  "yield",
  "enum",
  "implements",
  "interface",
  "type",
  "namespace",
  "declare",
  "bigint",
  "global",
  "globalThis",
  "Map",
  "WeakMap",
  "WeakSet",
  "Intl",
  "queueMicrotask",
  "performance",
  "document",
  "window",
  "self",
  "crypto",
  "TextEncoder",
  "TextDecoder",
  "FormData",
  "Blob",
  "File",
  "ReadableStream",
  "WritableStream",
  "TransformStream",
  "Event",
  "CustomEvent",
  "EventTarget",
  "AbortSignal",
  "AggregateError",
  "SuppressedError",
  "Iterator",
  "AsyncIterator",
  "Generator",
  "AsyncGenerator",
  "eval",
  "uneval",
  "escape",
  "unescape",
  "atob",
  "btoa",
  "requireAuth",
  "requireRole",
  "requirePermission",
  "requireHrmAccess",
  "asyncHandler",
  "Router",
  "Schema",
  "mongoose",
  "z",
  "req",
  "res",
  "next",
  "_req",
  "_res",
  "err",
  "error",
  "data",
  "body",
  "query",
  "params",
  "user",
  "id",
  "fn",
  "cb",
  "opts",
  "options",
  "config",
  "ctx",
  "doc",
  "row",
  "rows",
  "result",
  "results",
  "payload",
  "message",
  "status",
  "code",
  "field",
  "key",
  "value",
  "name",
  "type",
  "role",
  "email",
  "token",
  "session",
  "filter",
  "sort",
  "limit",
  "skip",
  "page",
  "total",
  "count",
  "list",
  "item",
  "items",
  "map",
  "filter",
  "reduce",
  "find",
  "some",
  "every",
  "includes",
  "push",
  "pop",
  "shift",
  "slice",
  "splice",
  "join",
  "split",
  "trim",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "constructor",
  "prototype",
  "length",
  "then",
  "catch",
  "finally",
  "resolve",
  "reject",
  "all",
  "race",
  "allSettled",
  "any",
  "describe",
  "test",
  "it",
  "assert",
  "expect",
  "before",
  "after",
  "beforeEach",
  "afterEach",
]);

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Schema files were never in SCAN_DIRS historically; skip to avoid mongoose ref: "Model" false positives.
    if (entry.isDirectory()) {
      if (entry.name === "schema") continue;
      walkJsFiles(full, out);
    } else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

function collectNamedExports(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+const\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+class\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const alias = trimmed.split(/\s+as\s+/i);
      names.add((alias[1] ?? alias[0]).trim());
    }
  }
  return names;
}

function buildExportIndex() {
  const index = new Map();
  for (const top of EXPORT_ROOTS) {
    const dir = path.join(root, top);
    for (const file of walkJsFiles(dir)) {
      for (const name of collectNamedExports(file)) {
        if (!index.has(name)) index.set(name, []);
        index.get(name).push(path.relative(root, file));
      }
    }
  }
  return index;
}

function parseImports(src) {
  const staticNames = new Set();
  const dynamicNames = new Set();

  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g)) {
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const alias = trimmed.split(/\s+as\s+/i);
      staticNames.add((alias[1] ?? alias[0]).trim());
    }
  }
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s*['"][^'"]+['"]/g)) {
    staticNames.add(m[1]);
  }
  for (const m of src.matchAll(/import\s*\*\s*as\s+(\w+)\s+from\s*['"][^'"]+['"]/g)) {
    staticNames.add(m[1]);
  }
  for (const m of src.matchAll(/await\s+import\s*\(\s*['"][^'"]+['"]\s*\)/g)) {
    // whole-module dynamic import — skip granular checks for that statement block
  }
  for (const m of src.matchAll(/const\s*\{([^}]+)\}\s*=\s*await\s+import\s*\(/g)) {
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const alias = trimmed.split(/\s+as\s+/i);
      dynamicNames.add((alias[1] ?? alias[0]).trim());
    }
  }

  return { staticNames, dynamicNames };
}

function localDeclarations(src) {
  const locals = new Set();
  for (const m of src.matchAll(/(?:async\s+)?function\s+(\w+)/g)) locals.add(m[1]);
  for (const m of src.matchAll(/(?:const|let|var)\s+(\w+)/g)) locals.add(m[1]);
  for (const m of src.matchAll(/class\s+(\w+)/g)) locals.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) locals.add(m[1]);
  return locals;
}

function findCallSites(src) {
  const sites = [];
  const re = /(?<![.\w])([A-Z][A-Za-z0-9_]*)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    sites.push({ name: m[1], index: m.index });
  }
  return sites;
}

function lineNumber(src, index) {
  return src.slice(0, index).split("\n").length;
}

const exportIndex = buildExportIndex();
const issues = [];

for (const scanDir of SCAN_DIRS) {
  const abs = path.join(root, scanDir);
  for (const file of walkJsFiles(abs)) {
    const rel = path.relative(path.join(root, ".."), file).replace(/\\/g, "/");
    const src = fs.readFileSync(file, "utf8");
    const { staticNames, dynamicNames } = parseImports(src);
    const imported = new Set([...staticNames, ...dynamicNames]);
    const locals = localDeclarations(src);

    for (const { name, index } of findCallSites(src)) {
      if (!exportIndex.has(name)) continue;
      if (BUILTINS.has(name) || IGNORE_IDENTIFIERS.has(name)) continue;
      if (locals.has(name) || imported.has(name)) continue;
      issues.push({
        file: rel,
        line: lineNumber(src, index),
        name,
        definedIn: exportIndex.get(name),
      });
    }
  }
}

if (issues.length) {
  console.error(`Missing import audit failed — ${issues.length} issue(s):\n`);
  for (const i of issues) {
    console.error(`  ${i.file}:${i.line}  ${i.name}()  (export from ${i.definedIn.join(", ")})`);
  }
  process.exit(1);
}

console.log("Import audit passed — no missing utility imports detected in controllers/services.");
