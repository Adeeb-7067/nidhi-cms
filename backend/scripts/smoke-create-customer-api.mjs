/**
 * Smoke test POST /api/sales/customers (super_admin + BDE).
 * Usage: node scripts/smoke-create-customer-api.mjs
 */
import "dotenv/config";
import mongoose from "mongoose";
import { usersTable, clientsTable } from "../src/models/schema/index.js";
import { signAccessToken } from "../src/lib/jwt.js";
import { deleteClientCompany } from "../src/modules/identity/services/client-company-provision.js";

const base = process.env.AUDIT_API_BASE || "http://localhost:15000";

async function postCustomer(token, body) {
  const r = await fetch(`${base}/api/sales/customers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: r.ok, status: r.status, data };
}

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

await mongoose.connect(uri);

const admin = await usersTable.findOne({ role: "super_admin", status: "active" }).lean();
const bde = await usersTable.findOne({ role: "bde", status: "active" }).lean();
if (!admin) {
  console.error("No active super_admin user");
  process.exit(1);
}

const adminToken = signAccessToken({ userId: admin.id, role: admin.role });
const bdeToken = bde ? signAccessToken({ userId: bde.id, role: bde.role }) : null;

const stamp = Date.now();
const createdIds = [];

async function cleanup() {
  for (const id of createdIds) {
    const row = await clientsTable.findOne({ id }).lean();
    if (row) await deleteClientCompany(row).catch(() => {});
  }
}

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

console.log(`\n=== POST /api/sales/customers smoke (${base}) ===\n`);

await check("super_admin: create customer with portal", async () => {
  const email = `smoke-admin-${stamp}@example.com`;
  const { ok, status, data } = await postCustomer(adminToken, {
    companyName: `Smoke Admin Co ${stamp}`,
    contactPerson: "Smoke Tester",
    email,
    enablePortal: true,
    portalEmail: email,
    password: "smokepass99",
    type: "corporate",
    status: "active",
  });
  if (!ok || status !== 201) {
    throw new Error(`HTTP ${status}: ${JSON.stringify(data)}`);
  }
  if (!data?.id || !data?.portalUserId) {
    throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
  }
  createdIds.push(data.id);
});

await check("super_admin: create customer without portal", async () => {
  const email = `smoke-noportal-${stamp}@example.com`;
  const { ok, status, data } = await postCustomer(adminToken, {
    companyName: `Smoke No Portal ${stamp}`,
    contactPerson: "Smoke Tester",
    email,
    enablePortal: false,
    type: "corporate",
    status: "active",
  });
  if (!ok || status !== 201) {
    throw new Error(`HTTP ${status}: ${JSON.stringify(data)}`);
  }
  if (!data?.id || data?.portalUserId) {
    throw new Error(`Expected no portalUserId: ${JSON.stringify(data)}`);
  }
  createdIds.push(data.id);
});

if (bdeToken) {
  await check("bde: create customer assigns to self", async () => {
    const email = `smoke-bde-${stamp}@example.com`;
    const { ok, status, data } = await postCustomer(bdeToken, {
      companyName: `Smoke BDE Co ${stamp}`,
      contactPerson: "BDE Smoke",
      email,
      enablePortal: true,
      portalEmail: email,
      password: "smokepass99",
      type: "corporate",
      status: "active",
    });
    if (!ok || status !== 201) {
      throw new Error(`HTTP ${status}: ${JSON.stringify(data)}`);
    }
    if (data?.assignedAdminId !== bde.id) {
      throw new Error(`assignedAdminId expected ${bde.id}, got ${data?.assignedAdminId}`);
    }
    createdIds.push(data.id);
  });
} else {
  console.log("  ⊘ skipped bde test (no active BDE user)");
}

await check("duplicate contact email returns 409 with field", async () => {
  const email = `smoke-dup-${stamp}@example.com`;
  const payload = {
    companyName: `Dup A ${stamp}`,
    contactPerson: "Dup",
    email,
    enablePortal: false,
    type: "corporate",
    status: "active",
  };
  const first = await postCustomer(adminToken, payload);
  if (!first.ok) throw new Error(`First create failed: ${JSON.stringify(first.data)}`);
  createdIds.push(first.data.id);

  const second = await postCustomer(adminToken, {
    ...payload,
    companyName: `Dup B ${stamp}`,
  });
  if (second.status !== 409) {
    throw new Error(`Expected 409, got ${second.status}: ${JSON.stringify(second.data)}`);
  }
  if (second.data?.field !== "email") {
    throw new Error(`Expected field=email, got ${JSON.stringify(second.data)}`);
  }
});

await cleanup();
await mongoose.disconnect();

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed\n`);
process.exit(failed.length ? 1 : 0);
