import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve backend/.env for source (load-env.js) and bundled (dist/index.mjs) runs. */
function resolveEnvPath() {
  const fromCwd = path.join(process.cwd(), ".env");
  if (fs.existsSync(fromCwd)) return fromCwd;

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot =
    path.basename(moduleDir) === "dist"
      ? path.resolve(moduleDir, "..")
      : moduleDir;
  return path.join(backendRoot, ".env");
}

config({ path: resolveEnvPath() });
