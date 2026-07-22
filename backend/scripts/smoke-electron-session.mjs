/**
 * Electron desktop session smoke: same API calls as the shell, with Origin: null
 * (file:// renderer) and work-session heartbeat/clock paths used by main.js.
 *
 * Usage: node scripts/smoke-electron-session.mjs
 */
const base = (process.env.API_BASE || "http://localhost:15000").replace(/\/+$/, "");
const api = `${base}/api`;
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: String(detail).slice(0, 160) });
  } catch (e) {
    results.push({
      name,
      ok: false,
      detail: `${e.status ? e.status + " " : ""}${(e.message || String(e)).slice(0, 200)}`,
    });
  }
}

/** Mimic Electron file:// fetch (Origin: null). */
async function req(path, { method = "GET", token, body, origin = "null" } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Origin: origin,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(api + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || text || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { data, corsOrigin: res.headers.get("access-control-allow-origin") };
}

let accessToken;
let refreshToken;
let userId;
let sessionId;

const staffId = process.env.ELECTRON_SMOKE_USER || "MO002";
const staffPw = process.env.ELECTRON_SMOKE_PASS || "Dev@123";

await check("CORS preflight Origin null", async () => {
  const res = await fetch(api + "/auth/login", {
    method: "OPTIONS",
    headers: {
      Origin: "null",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    },
  });
  if (!res.ok && res.status !== 204) throw new Error(`preflight ${res.status}`);
  const allow = res.headers.get("access-control-allow-origin");
  if (allow !== "null" && allow !== "*") {
    throw new Error(`ACA-Origin=${allow}`);
  }
  return `ACA-Origin=${allow}`;
});

await check("staff login (Origin null)", async () => {
  const { data, corsOrigin } = await req("/auth/login", {
    method: "POST",
    body: { identifier: staffId, password: staffPw },
  });
  if (!data.accessToken || !data.refreshToken) throw new Error("missing tokens");
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  userId = data.user.id;
  return `role=${data.user.role} id=${userId} cors=${corsOrigin}`;
});

await check("auth/me (Origin null)", async () => {
  const { data } = await req("/auth/me", { token: accessToken });
  return `id=${data.id}`;
});

await check("auth/refresh (Origin null)", async () => {
  const { data } = await req("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
  if (!data.accessToken) throw new Error("missing accessToken");
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  return "ok";
});

await check("permissions/me (Origin null)", async () => {
  await req("/permissions/me", { token: accessToken });
  return "ok";
});

await check("work-sessions/active", async () => {
  const { data } = await req("/work-sessions/active", { token: accessToken });
  sessionId = data?.session?.id ?? data?.id ?? null;
  return `active=${Boolean(data?.session)} sessionId=${sessionId ?? "none"}`;
});

await check("work-sessions/clock-in", async () => {
  const { data } = await req("/work-sessions/clock-in", {
    method: "POST",
    token: accessToken,
    body: { deviceInfo: "Electron/win32-smoke" },
  });
  sessionId = data?.session?.id ?? data?.id ?? sessionId;
  if (!sessionId) throw new Error(`no session id: ${JSON.stringify(data).slice(0, 120)}`);
  return `sessionId=${sessionId}`;
});

await check("work-sessions/heartbeat (main process)", async () => {
  // main.js posts Authorization only (no body) — match that
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Origin: "null",
  };
  const res = await fetch(api + "/work-sessions/heartbeat", {
    method: "POST",
    headers,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || text || res.statusText);
    err.status = res.status;
    throw err;
  }
  return `hasSession=${Boolean(data?.session)} stopReason=${data?.stopReason ?? "-"}`;
});

await check("work-sessions/clock-out (app_quit)", async () => {
  const { data } = await req("/work-sessions/clock-out", {
    method: "POST",
    token: accessToken,
    body: { stopReason: "app_quit" },
  });
  return `active=${data?.session?.isActive ?? data?.isActive ?? "n/a"}`;
});

await check("vite origin still allowed", async () => {
  const { data } = await req("/auth/me", {
    token: accessToken,
    origin: "http://localhost:5173",
  });
  return `id=${data.id}`;
});

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
