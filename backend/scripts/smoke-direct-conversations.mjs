import "dotenv/config";
import mongoose from "mongoose";
import { usersTable } from "../src/models/schema/index.js";
import { signAccessToken } from "../src/lib/jwt.js";
import { staffEmployeeRoles } from "../src/constants/user-roles.js";

const base = process.env.AUDIT_API_BASE || "http://localhost:15000";

async function request(method, path, token, body) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: r.ok, status: r.status, json };
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
const staff = await usersTable
  .find({ role: { $in: staffEmployeeRoles }, status: "active", id: { $ne: admin?.id } })
  .limit(2)
  .lean();

if (!admin || staff.length < 2) {
  console.error("Need super_admin + 2 staff users");
  process.exit(1);
}

const adminToken = signAccessToken({ userId: admin.id, role: admin.role });
const [peerA, peerB] = staff;

console.log("GET /api/direct-conversations");
const list1 = await request("GET", "/api/direct-conversations", adminToken);
assert(list1.ok, `list failed: ${list1.status}`);

console.log("POST conversation with peer A");
const createA = await request("POST", "/api/direct-conversations", adminToken, {
  participantUserId: peerA.id,
});
assert(createA.status === 201, `create A failed: ${createA.status} ${JSON.stringify(createA.json)}`);
const convAId = createA.json?.conversation?.id;
assert(convAId, "missing conversation id for peer A");

console.log("POST conversation with peer B");
const createB = await request("POST", "/api/direct-conversations", adminToken, {
  participantUserId: peerB.id,
});
assert(createB.status === 201, `create B failed: ${createB.status} ${JSON.stringify(createB.json)}`);
const convBId = createB.json?.conversation?.id;
assert(convBId && convBId !== convAId, "peer B conversation must differ from peer A");

console.log("POST duplicate peer A (must not 409)");
const createADup = await request("POST", "/api/direct-conversations", adminToken, {
  participantUserId: peerA.id,
});
assert(
  createADup.status === 201,
  `duplicate create must succeed: ${createADup.status} ${JSON.stringify(createADup.json)}`,
);
assert(
  createADup.json?.conversation?.id === convAId,
  `duplicate must return same conversation id (${createADup.json?.conversation?.id} vs ${convAId})`,
);

console.log("GET contacts");
const contacts = await request("GET", "/api/direct-conversations/contacts", adminToken);
assert(contacts.ok, `contacts failed: ${contacts.status}`);
assert(Array.isArray(contacts.json?.staffContacts), "staffContacts missing");

console.log("All direct-conversation smoke checks passed.");
await mongoose.disconnect();
