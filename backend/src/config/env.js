import fs from "node:fs";
import path from "node:path";

function getRequiredPort() {
  const rawPort = process.env["PORT"];
  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided."
    );
  }
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }
  return port;
}
function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return true;
  return raw.split(",").map((o) => o.trim());
}

/** Resolved path to built frontend (`index.html`), or null if not configured / missing. */
function getFrontendDistPath() {
  const raw = process.env.FRONTEND_DIST?.trim();
  if (!raw) return null;
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  const indexHtml = path.join(resolved, "index.html");
  if (!fs.existsSync(indexHtml)) return null;
  return resolved;
}

export {
  getAllowedOrigins,
  getFrontendDistPath,
  getRequiredPort
};
