import "dotenv/config";
import mongoose from "mongoose";
import { usersTable } from "../src/models/schema/index.js";
import { signAccessToken } from "../src/lib/jwt.js";
import { monitorableStaffRoles } from "../src/constants/user-roles.js";

const base = process.env.AUDIT_API_BASE || "http://localhost:15000";

async function get(path, token) {
  const r = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body };
}

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri) {
  console.error("No MONGODB_URI");
  process.exit(1);
}
await mongoose.connect(uri);
const dev = await usersTable.findOne({ role: { $in: monitorableStaffRoles }, status: "active" }).lean();
const admin = await usersTable.findOne({ role: "super_admin", status: "active" }).lean();
if (!dev || !admin) {
  console.error("Missing test users");
  process.exit(1);
}
const devToken = signAccessToken({ userId: dev.id, role: dev.role });
const adminToken = signAccessToken({ userId: admin.id, role: admin.role });

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    checks.push({ name, ok: false, err: err.message });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

console.log("\n=== Session API smoke ===\n");

await check("GET /active returns session or null", async () => {
  const { ok, body } = await get("/api/work-sessions/active", devToken);
  if (!ok) throw new Error(`HTTP ${body}`);
  if (body && !("session" in body)) throw new Error("missing session field");
});

await check("GET /daily-totals", async () => {
  const { ok, body } = await get("/api/work-sessions/daily-totals", adminToken);
  if (!ok) throw new Error(JSON.stringify(body));
  if (!Array.isArray(body?.data)) throw new Error("missing data array");
});

await check("POST /heartbeat", async () => {
  const r = await fetch(`${base}/api/work-sessions/heartbeat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${devToken}` },
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(JSON.stringify(body));
  if (body && !("session" in body)) throw new Error("missing session field");
});

await mongoose.disconnect();

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed\n`);
process.exit(failed.length ? 1 : 0);
