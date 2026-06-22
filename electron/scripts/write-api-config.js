/**
 * Writes electron/assets/api-config.json before packaging.
 * The main process uses this for screenshot uploads and file:///uploads redirects.
 * Dev uses launch.js (CMS_API_URL); packaged .exe has no launcher — needs this file.
 */
const fs = require("fs");
const path = require("path");

function readDotEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const result = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
      result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

const frontendEnv = readDotEnv(path.join(__dirname, "..", "..", "frontend", ".env"));

const apiUrl = (
  process.env.VITE_API_BASE_URL ||
  process.env.CMS_API_URL ||
  frontendEnv.VITE_API_BASE_URL ||
  "http://localhost:8080"
).replace(/\/+$/, "");

const assetsDir = path.join(__dirname, "..", "assets");
fs.mkdirSync(assetsDir, { recursive: true });

const outPath = path.join(assetsDir, "api-config.json");
fs.writeFileSync(outPath, JSON.stringify({ apiUrl }, null, 2) + "\n", "utf-8");

console.log(`[electron] api-config.json → ${apiUrl}`);
