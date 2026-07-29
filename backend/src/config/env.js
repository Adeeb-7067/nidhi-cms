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

/** Vite `--host 0.0.0.0` serves on LAN IPs; allow those in local development only. */
function isPrivateLanHostname(hostname) {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

/**
 * Shared CORS origin check for Express + Socket.IO.
 * Returns true when the request origin is allowed.
 */
function isAllowedOrigin(origin) {
  // No Origin (same-origin / non-browser) or Electron file:// (Origin: null)
  if (!origin || origin === "null") return true;
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return true;
  const allowed = raw.split(",").map((o) => o.trim()).filter(Boolean);
  if (allowed.includes(origin)) return true;
  // Vite --host 0.0.0.0 prints Network: http://10.x.x.x:5173 — allow LAN in development.
  if (process.env.NODE_ENV === "development") {
    try {
      return isPrivateLanHostname(new URL(origin).hostname);
    } catch {
      return false;
    }
  }
  return false;
}

function getAllowedOrigins() {
  return (origin, callback) => {
    callback(null, isAllowedOrigin(origin));
  };
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
  getRequiredPort,
  isAllowedOrigin,
};
