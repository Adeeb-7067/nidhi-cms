/**
 * One-off: split controller routers into controllers (handlers) + routes (Router).
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllersDir = path.join(__dirname, "../src/controllers");
const routesDir = path.join(__dirname, "../src/routes");

const SKIP = new Set(["health"]);
const FEATURES = [
  "auth",
  "search",
  "users",
  "clients",
  "companies",
  "projects",
  "logs",
  "bugs",
  "tasks",
  "apk",
  "comments",
  "notifications",
  "requests",
  "analytics",
  "reports",
  "settings",
  "uploads",
  "tickets",
  "inventory",
];

const ROUTES_ONLY = process.argv.includes("--routes-only");

function pathToHandlerName(method, routePath) {
  const segments = routePath
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((s) => {
      if (s.startsWith(":")) return "By" + s.slice(1).replace(/^\w/, (c) => c.toUpperCase());
      if (s === "mark-all-read") return "MarkAllRead";
      return s
        .split(/[-_]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("");
    });
  const base = segments.join("") || "root";
  const prefix =
    method === "get"
      ? "get"
      : method === "post"
        ? "post"
        : method === "patch"
          ? "patch"
          : method === "delete"
            ? "delete"
            : method === "put"
              ? "put"
              : method;
  return prefix + base.charAt(0).toUpperCase() + base.slice(1);
}

function extractRoutes(source) {
  const routes = [];
  const routeRe = /router\.(get|post|patch|delete|put)\s*\(/g;
  let m;
  while ((m = routeRe.exec(source)) !== null) {
    routes.push({
      method: m[1],
      start: m.index,
      openParen: source.indexOf("(", m.index),
    });
  }
  return routes;
}

function findRouteCallEnd(source, openParen) {
  let depth = 0;
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error("unbalanced parens");
}

function parseRouteCall(callText) {
  const methodMatch = callText.match(/^router\.(get|post|patch|delete|put)\(/);
  if (!methodMatch) throw new Error("not a route call");
  const method = methodMatch[1];

  let i = callText.indexOf("(") + 1;
  while (i < callText.length && /\s/.test(callText[i])) i++;

  const quote = callText[i];
  if (!['"', "'", "`"].includes(quote)) throw new Error("path quote");
  i++;
  const pathStart = i;
  while (callText[i] !== quote) i++;
  const routePath = callText.slice(pathStart, i);
  i++;
  while (callText[i] === "," || /\s/.test(callText[i])) i++;

  const middlewares = [];
  let handlerBody = null;
  let handlerIsAsyncArrow = false;

  const readIdent = () => {
    const start = i;
    while (/[\w$]/.test(callText[i])) i++;
    return callText.slice(start, i);
  };

  while (callText[i] !== ")") {
    while (/\s|,/.test(callText[i])) i++;
    if (callText[i] === ")") break;

    if (callText[i] === "(" || (callText.startsWith("async", i) && !callText.startsWith("asyncHandler", i))) {
      const start = i;
      if (callText.startsWith("async", i)) {
        i += 5;
        while (/\s/.test(callText[i])) i++;
      }
      if (callText[i] === "(") {
        let depth = 0;
        do {
          const ch = callText[i];
          if (ch === "(") depth++;
          else if (ch === ")") depth--;
          i++;
        } while (depth > 0);
      }
      while (/\s/.test(callText[i])) i++;
      if (callText.startsWith("=>", i)) {
        i += 2;
        while (/\s/.test(callText[i])) i++;
        if (callText[i] === "{") {
          let depth = 0;
          const bodyStart = i;
          do {
            const ch = callText[i];
            if (ch === "{") depth++;
            else if (ch === "}") depth--;
            i++;
          } while (depth > 0);
          handlerBody = callText.slice(start, i).trim();
          handlerIsAsyncArrow = true;
          continue;
        }
      }
      i = start;
    }

    if (callText[i] === "(") {
      const start = i;
      let depth = 0;
      do {
        const ch = callText[i];
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        i++;
      } while (depth > 0);
      middlewares.push(callText.slice(start, i).trim());
      continue;
    }

    if (callText.startsWith("asyncHandler", i)) {
      i += "asyncHandler".length;
      while (callText[i] !== "(") i++;
      const innerStart = i + 1;
      i = innerStart;
      let depth = 1;
      while (depth > 0) {
        const ch = callText[i];
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        i++;
      }
      handlerBody = callText.slice(innerStart, i - 1).trim();
      handlerIsAsyncArrow = true;
      if (handlerBody.startsWith("(")) {
        const close = handlerBody.lastIndexOf(")");
        const params = handlerBody.slice(1, close).trim();
        const rest = handlerBody.slice(close + 1).trim();
        if (!rest.startsWith("=>")) throw new Error("arrow in asyncHandler");
        handlerBody = `async function(${params}) ${rest}`;
      }
      continue;
    }

    if (callText[i] === "(" || callText[i] === "[" || callText[i] === "{") {
      const start = i;
      const open = callText[i];
      const close = open === "(" ? ")" : open === "[" ? "]" : "}";
      let depth = 0;
      do {
        const ch = callText[i];
        if (ch === open) depth++;
        else if (ch === close) depth--;
        i++;
      } while (depth > 0);
      middlewares.push(callText.slice(start, i).trim());
      continue;
    }

    const identStart = i;
    const ident = readIdent();
    if (!ident) throw new Error("empty ident at " + i);
    while (callText[i] === ".") {
      i++;
      readIdent();
    }
    if (callText[i] === "(") {
      let depth = 0;
      do {
        const ch = callText[i];
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        i++;
      } while (depth > 0);
    }
    middlewares.push(callText.slice(identStart, i).trim());
  }

  if (!handlerBody) {
    const last = middlewares[middlewares.length - 1];
    if (last && (last.startsWith("async") || last.startsWith("(") || last.includes("=>"))) {
      const h = middlewares.pop();
      if (h.startsWith("async ")) {
        handlerBody = h.replace(/^async\s+/, "async function ");
        handlerIsAsyncArrow = true;
      } else {
        handlerBody = h;
      }
    }
  }

  if (!handlerBody) throw new Error(`no handler in ${routePath}`);

  return { method, path: routePath, middlewares, handlerBody, handlerIsAsyncArrow };
}

function transformControllerSource(source, feature, routeDefs) {
  const usedNames = new Set();
  const replacements = [];
  for (const def of routeDefs) {
    let name = pathToHandlerName(def.method, def.path);
    if (usedNames.has(name)) {
      let n = 2;
      while (usedNames.has(name + n)) n++;
      name = name + n;
    }
    usedNames.add(name);
    def.handlerName = name;

    const fnDecl = def.handlerBody.startsWith("async function")
      ? def.handlerBody.replace(
          /^async function\s*\(([^)]*)\)/,
          `export async function ${name}(req: Request, res: Response)`,
        )
      : def.handlerBody.includes("=>")
        ? (() => {
            const arrow = def.handlerBody;
            const m = arrow.match(
              /^(async\s+)?\(?([^)]*)\)?\s*=>\s*(\{[\s\S]*\}|.+)$/,
            );
            if (!m) throw new Error("arrow parse " + def.path + " :: " + arrow.slice(0, 80));
            const isAsync = Boolean(m[1]);
            const body = m[3].trim();
            const bodyWrapped = body.startsWith("{") ? body : `{ return ${body}; }`;
            const kw = isAsync ? "export async function" : "export function";
            return `${kw} ${name}(req: Request, res: Response) ${bodyWrapped}`;
          })()
        : `export async function ${name}(req: Request, res: Response) {\n${def.handlerBody}\n}`;

    replacements.push({ start: def.callStart, end: def.callEnd, text: fnDecl + "\n" });
  }

  let out = source;
  replacements.sort((a, b) => b.start - a.start);
  for (const rep of replacements) {
    out = out.slice(0, rep.start) + rep.text + out.slice(rep.end);
  }

  out = out.replace(
    /import\s*\{[^}]*Router[^}]*\}\s*from\s*["']express["'];?\s*\n/g,
    "",
  );
  out = out.replace(
    /import\s+asyncHandler\s+from\s*["']express-async-handler["'];?\s*\n/g,
    "",
  );
  out = out.replace(/import\s+rateLimit\s+from\s*["']express-rate-limit["'];?\s*\n/g, "");
  out = out.replace(/const\s+\w+Limiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);?\s*\n/g, "");
  out = out.replace(/import\s+multer\s+from\s*["']multer["'];?\s*\n/g, "");
  out = out.replace(/function parseCategory[\s\S]*?^}\s*\n/gm, "");
  out = out.replace(/const\s+upload\s*=\s*multer\(\{[\s\S]*?\}\);?\s*\n/g, "");
  out = out.replace(/const\s+router\s*=\s*Router\(\);?\s*\n/g, "");
  out = out.replace(/export\s+default\s+router;?\s*\n?/g, "");
  out = out.replace(/import\s*\{[^}]*\brequireAuth\b[^}]*\}\s*from\s*["']@\/middlewares\/auth["'];?\s*\n/g, "");

  if (!out.includes("Request") || !out.includes("Response")) {
    const firstImport = out.match(/^import\s/m);
    if (firstImport) {
      out = 'import type { Request, Response } from "express";\n' + out;
    }
  }

  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trimEnd() + "\n";
}

function assignHandlerNames(routeDefs) {
  const usedNames = new Set();
  for (const def of routeDefs) {
    let name = pathToHandlerName(def.method, def.path);
    if (usedNames.has(name)) {
      let n = 2;
      while (usedNames.has(name + n)) n++;
      name = name + n;
    }
    usedNames.add(name);
    def.handlerName = name;
  }
}

function buildRoutesFile(feature, routeDefs, extraImports = "") {
  const ctlImport = `import * as ${feature}Controller from "@/controllers/${feature}.controller";`;
  const lines = [
    'import { Router, type IRouter } from "express";',
    'import asyncHandler from "express-async-handler";',
    'import { requireAuth, requireRole } from "@/middlewares/auth";',
    ctlImport,
    extraImports ? extraImports.trim() : "",
    "",
    "const router: IRouter = Router();",
    "",
  ].filter(Boolean);

  for (const def of routeDefs) {
    const mw = def.middlewares.length
      ? def.middlewares.join(", ") + ", "
      : "";
    lines.push(
      `router.${def.method}("${def.path}", ${mw}asyncHandler(${feature}Controller.${def.handlerName}));`,
    );
  }

  lines.push("", "export default router;", "");
  return lines.join("\n");
}

function extractExtraImports(source, feature) {
  const extras = [];
  if (feature === "auth" && source.includes("express-rate-limit")) {
    extras.push('import rateLimit from "express-rate-limit";');
    const limiterBlocks = source.match(
      /const\s+\w+Limiter\s*=\s*rateLimit\(\{[\s\S]*?\}\);/g,
    );
    if (limiterBlocks) extras.push(...limiterBlocks);
  }
  if (feature === "uploads" && source.includes("multer")) {
    extras.push(
      'import multer from "multer";\nimport { UPLOAD_CATEGORIES, type UploadCategory } from "@/lib/file-storage";',
    );
    const uploadMulter = source.match(
      /const upload = multer\(\{[\s\S]*?\}\);/,
    );
    if (uploadMulter) extras.push(uploadMulter[0]);
  }
  return extras.join("\n\n");
}

for (const feature of FEATURES) {
  if (SKIP.has(feature)) continue;
  const ctrlPath = path.join(controllersDir, `${feature}.controller.ts`);
  let source = fs.readFileSync(ctrlPath, "utf8");
  if (ROUTES_ONLY || !source.includes("router.")) {
    source = execSync(
      `git show HEAD:artifacts/api-server/src/routes/${feature}.ts`,
      { cwd: path.join(__dirname, "../.."), encoding: "utf8" },
    );
  }
  const routeStarts = extractRoutes(source);
  const routeDefs = [];

  for (let idx = 0; idx < routeStarts.length; idx++) {
    const r = routeStarts[idx];
    const callEnd = findRouteCallEnd(source, r.openParen);
    const callText = source.slice(r.start, callEnd);
    const def = parseRouteCall(callText);
    def.callStart = r.start;
    def.callEnd = callEnd;
    routeDefs.push(def);
  }

  assignHandlerNames(routeDefs);
  const extra = extractExtraImports(source, feature);
  const newRoutes = buildRoutesFile(feature, routeDefs, extra);
  if (!ROUTES_ONLY && source.includes("router.")) {
    const newCtrl = transformControllerSource(source, feature, routeDefs);
    fs.writeFileSync(ctrlPath, newCtrl);
  }
  fs.writeFileSync(path.join(routesDir, `${feature}.routes.ts`), newRoutes);
  console.log(`${feature}: ${routeDefs.length} routes`);
}

console.log("done");
