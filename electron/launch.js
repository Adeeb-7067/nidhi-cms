/**
 * Dev launcher: removes ELECTRON_RUN_AS_NODE from the environment before
 * spawning Electron. This variable is set by VS Code (itself an Electron app)
 * and causes child Electron processes to run in plain Node.js mode instead of
 * as a full Electron browser process.
 *
 * Also reads VITE_API_BASE_URL from frontend/.env and passes it as CMS_API_URL
 * so the main process can redirect file:///uploads/* image requests to the backend.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// require('electron') returns the binary path when run under plain Node.js
const electronBin = require('electron');

/** Parse a .env file — no dependencies needed. */
function readDotEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      // Strip surrounding quotes
      const val = trimmed.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

const frontendEnv = readDotEnv(path.join(__dirname, '..', 'frontend', '.env'));

const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;

// Pass the backend URL to the Electron main process so it can redirect
// file:///uploads/* requests to the real backend origin.
env.CMS_API_URL = (
  process.env.VITE_API_BASE_URL ||   // CLI override takes precedence
  frontendEnv.VITE_API_BASE_URL ||   // from frontend/.env
  'http://localhost:15000'
).replace(/\/+$/, '');

const child = spawn(electronBin, [path.join(__dirname)], {
  stdio: 'inherit',
  env,
  cwd: __dirname,
});

child.on('close', (code) => process.exit(code ?? 0));
