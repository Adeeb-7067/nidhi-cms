import "dotenv/config";
import mongoose from "mongoose";
import { usersTable } from "../src/models/schema/index.js";
import { signAccessToken } from "../src/lib/jwt.js";
import { monitorableStaffRoles } from "../src/constants/user-roles.js";

const base = process.env.AUDIT_API_BASE || "http://localhost:15000";
const SLOW_MS = 1500;

async function timedGet(path, token) {
  const start = performance.now();
  const r = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ms = Math.round(performance.now() - start);
  const body = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body, ms };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri) {
  console.error("No MONGODB_URI");
  process.exit(1);
}

await mongoose.connect(uri);

const admin = await usersTable.findOne({ role: "super_admin", status: "active" }).lean();
const dev = await usersTable
  .findOne({ role: { $in: monitorableStaffRoles }, status: "active" })
  .lean();
const client = await usersTable.findOne({ role: "client", status: "active" }).lean();

if (!admin || !dev) {
  console.error("Need admin + staff users");
  process.exit(1);
}

const adminToken = signAccessToken({ userId: admin.id, role: admin.role });
const devToken = signAccessToken({ userId: dev.id, role: dev.role });
const clientToken = client
  ? signAccessToken({ userId: client.id, role: client.role })
  : null;

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

console.log("\n=== Discussions system smoke ===\n");

await check("Admin GET /api/projects (discussions list source)", async () => {
  const { ok, body, ms } = await timedGet("/api/projects?limit=100", adminToken);
  assert(ok, `HTTP fail (${ms}ms)`);
  assert(Array.isArray(body?.projects), "missing projects");
  if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
  console.log(`      ${ms}ms · ${body.projects.length} projects`);
});

await check("Admin GET /api/comments/project-previews", async () => {
  const { ok, body, ms } = await timedGet("/api/comments/project-previews", adminToken);
  assert(ok, `HTTP fail (${ms}ms)`);
  assert(Array.isArray(body?.previews), "missing previews");
  if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
  console.log(`      ${ms}ms · ${body.previews.length} previews`);
});

await check("Admin GET /api/direct-conversations", async () => {
  const { ok, body, ms } = await timedGet("/api/direct-conversations", adminToken);
  assert(ok, `HTTP fail (${ms}ms)`);
  assert(Array.isArray(body?.conversations), "missing conversations");
  if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
  console.log(`      ${ms}ms · ${body.conversations.length} direct chats`);
});

await check("Admin GET /api/direct-conversations/contacts", async () => {
  const { ok, body, ms } = await timedGet("/api/direct-conversations/contacts", adminToken);
  assert(ok, `HTTP fail (${ms}ms)`);
  assert(Array.isArray(body?.staffContacts), "missing staffContacts");
  if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
  console.log(
    `      ${ms}ms · ${body.staffContacts.length} staff, ${body.clientContacts.length} clients`,
  );
});

await check("Dev GET /api/direct-conversations (participant view)", async () => {
  const { ok, body, ms } = await timedGet("/api/direct-conversations", devToken);
  assert(ok, `HTTP fail (${ms}ms)`);
  assert(Array.isArray(body?.conversations), "missing conversations");
  if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
  console.log(`      ${ms}ms · ${body.conversations.length} direct chats`);
});

await check("Dev forbidden on POST /api/direct-conversations/contacts", async () => {
  const r = await fetch(`${base}/api/direct-conversations/contacts`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  assert(r.status === 403, `expected 403, got ${r.status}`);
});

if (clientToken) {
  await check("Client GET /api/projects", async () => {
    const { ok, body, ms } = await timedGet("/api/projects?limit=100", clientToken);
    assert(ok, `HTTP fail (${ms}ms)`);
    assert(Array.isArray(body?.projects), "missing projects");
    if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
    console.log(`      ${ms}ms · ${body.projects.length} projects`);
  });

  await check("Client GET /api/direct-conversations", async () => {
    const { ok, body, ms } = await timedGet("/api/direct-conversations", clientToken);
    assert(ok, `HTTP fail (${ms}ms)`);
    assert(Array.isArray(body?.conversations), "missing conversations");
    if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
    console.log(`      ${ms}ms · ${body.conversations.length} direct chats`);
  });

  await check("Client forbidden on contacts endpoint", async () => {
    const r = await fetch(`${base}/api/direct-conversations/contacts`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });
} else {
  console.log("  · skipped client checks (no active client user)");
}

await check("Comments thread reachable (company team official)", async () => {
  const { ok, body, ms } = await timedGet(
    "/api/comments?threadType=company_team&threadId=0&limit=20",
    devToken,
  );
  assert(ok, `HTTP fail (${ms}ms)`);
  assert(Array.isArray(body?.comments), "missing comments");
  if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
  console.log(`      ${ms}ms · ${body.comments.length} messages`);
});

await check("Comments thread reachable (company team non-official)", async () => {
  const { ok, body, ms } = await timedGet(
    "/api/comments?threadType=company_team_unofficial&threadId=0&limit=20",
    devToken,
  );
  assert(ok, `HTTP fail (${ms}ms)`);
  assert(Array.isArray(body?.comments), "missing comments");
  if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
  console.log(`      ${ms}ms · ${body.comments.length} messages`);
});

await check("Notifications unread (discussions badge source)", async () => {
  const { ok, body, ms } = await timedGet(
    "/api/notifications?unreadOnly=true&limit=100",
    adminToken,
  );
  assert(ok, `HTTP fail (${ms}ms)`);
  assert(Array.isArray(body?.notifications), "missing notifications");
  if (ms > SLOW_MS) throw new Error(`slow: ${ms}ms`);
  console.log(`      ${ms}ms · ${body.notifications.length} unread`);
});

await mongoose.disconnect();

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed\n`);
process.exit(failed.length ? 1 : 0);
