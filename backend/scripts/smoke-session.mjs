/**
 * Live session + RBAC smoke against local API.
 * Usage: node scripts/smoke-session.mjs
 */
const base = process.env.API_BASE || "http://localhost:15000/api";
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: String(detail).slice(0, 140) });
  } catch (e) {
    results.push({
      name,
      ok: false,
      detail: `${e.status ? e.status + " " : ""}${(e.message || String(e)).slice(0, 180)}`,
    });
  }
}

async function req(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
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
  return data;
}

let adminToken;
let adminRefresh;
let adminId;
let devToken;
let devId;

await check("healthz", async () => JSON.stringify(await req("/healthz")));

await check("admin login", async () => {
  const admin = await req("/auth/login", {
    method: "POST",
    body: { identifier: "admin@satyakabir.com", password: "Admin@123" },
  });
  if (!admin.accessToken || !admin.refreshToken) throw new Error("missing tokens");
  adminToken = admin.accessToken;
  adminRefresh = admin.refreshToken;
  adminId = admin.user.id;
  return `role=${admin.user.role} id=${adminId}`;
});

await check("auth/me", async () => {
  const me = await req("/auth/me", { token: adminToken });
  return `id=${me.id} role=${me.role}`;
});

await check("auth/refresh", async () => {
  const r = await req("/auth/refresh", {
    method: "POST",
    body: { refreshToken: adminRefresh },
  });
  if (!r.accessToken || !r.refreshToken) throw new Error("missing refreshed tokens");
  adminToken = r.accessToken;
  adminRefresh = r.refreshToken;
  return "ok";
});

await check("auth/me after refresh", async () => {
  const me = await req("/auth/me", { token: adminToken });
  return `id=${me.id}`;
});

await check("GET /projects", async () => {
  const p = await req("/projects?limit=5", { token: adminToken });
  return `count=${p.projects?.length ?? 0} total=${p.total}`;
});

await check("GET /settings", async () => {
  const s = await req("/settings", { token: adminToken });
  return `company=${s.companyName}`;
});

await check("GET /presence", async () => {
  const p = await req("/presence", { token: adminToken });
  return `presence=${typeof p.presence}`;
});

await check("GET /tickets", async () => {
  const t = await req("/tickets?limit=5", { token: adminToken });
  return Object.keys(t).join(",");
});

await check("GET /users?staff=1", async () => {
  const u = await req("/users?staff=1&limit=5", { token: adminToken });
  return `users=${u.users?.length ?? 0}`;
});

await check("GET /permissions/me", async () => {
  await req("/permissions/me", { token: adminToken });
  return "ok";
});

await check("GET /search", async () => {
  const s = await req("/search?q=har", { token: adminToken });
  return `keys=${Object.keys(s).join(",")}`;
});

await check("developer login MO002", async () => {
  const d = await req("/auth/login", {
    method: "POST",
    body: { identifier: "MO002", password: "Dev@123" },
  });
  if (!d.accessToken) throw new Error("no token");
  devToken = d.accessToken;
  devId = d.user.id;
  return `role=${d.user.role} id=${devId}`;
});

await check("dev GET /projects", async () => {
  const p = await req("/projects?limit=10", { token: devToken });
  return `count=${p.projects?.length ?? 0} total=${p.total}`;
});

await check("dev GET own profile", async () => {
  const u = await req(`/users/${devId}`, { token: devToken });
  return `name=${u.name}`;
});

await check("dev GET admin profile → 403", async () => {
  try {
    await req(`/users/${adminId}`, { token: devToken });
    throw new Error("expected 403");
  } catch (e) {
    if (e.status === 403) return "403 ok";
    throw e;
  }
});

await check("dev GET /settings subset", async () => {
  const s = await req("/settings", { token: devToken });
  const leakedHrm = s.hrmPaidLeavesPerMonth != null;
  return `company=${s.companyName} leakedHrmAdmin=${leakedHrm}`;
});

await check("dev GET /tickets (scoped)", async () => {
  const t = await req("/tickets?limit=5", { token: devToken });
  return Object.keys(t).join(",");
});

await check("unauth /projects → 401", async () => {
  try {
    await req("/projects");
    throw new Error("expected 401");
  } catch (e) {
    if (e.status === 401) return "401 ok";
    throw e;
  }
});

await check("frontend vite", async () => {
  const res = await fetch("http://localhost:5173/");
  if (!res.ok) throw new Error(`status ${res.status}`);
  return `status=${res.status}`;
});

for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} | ${r.name} | ${r.detail}`);
}
const failed = results.filter((r) => !r.ok);
console.log("---");
console.log(`PASSED ${results.length - failed.length}/${results.length}`);
process.exit(failed.length ? 1 : 0);
