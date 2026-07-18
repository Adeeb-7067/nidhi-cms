/**
 * Smoke test POST /api/sales/proposals + send
 * Usage: node scripts/smoke-proposal-create-send.mjs
 */
import "dotenv/config";
import mongoose from "mongoose";
import { usersTable, SalesLeads, SalesProposals } from "../src/models/schema/index.js";
import { signAccessToken } from "../src/lib/jwt.js";

const base = process.env.AUDIT_API_BASE || "http://localhost:15000";

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

await mongoose.connect(uri);

const admin = await usersTable.findOne({ role: "super_admin", status: "active" }).lean();
const lead = await SalesLeads.findOne({ status: { $nin: ["converted", "lost", "closed_elsewhere"] } }).lean();
if (!admin || !lead) {
  console.error("Need active super_admin and open lead");
  process.exit(1);
}

const token = signAccessToken({ userId: admin.id, role: admin.role });
const body = {
  title: `Smoke proposal ${Date.now()}`,
  leadId: lead.id,
  items: [
    {
      itemId: "1",
      name: "Test item",
      description: "",
      quantity: 1,
      unitPrice: 1000,
      taxPercent: 18,
    },
  ],
  discount: 0,
  validUntil: "2026-08-05",
};

const r = await fetch(`${base}/api/sales/proposals`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});
const text = await r.text();
console.log("CREATE", r.status, text.slice(0, 800));

let data = null;
try {
  data = text ? JSON.parse(text) : null;
} catch {
  data = text;
}

const pid = data?.id;
console.log("parsed id:", pid, typeof pid);

if (pid) {
  const r2 = await fetch(`${base}/api/sales/proposals/${pid}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const t2 = await r2.text();
  console.log("SEND", r2.status, t2.slice(0, 800));
}

// cleanup draft/sent test proposal
if (pid) {
  await SalesProposals.deleteOne({ id: pid });
  console.log("cleaned up proposal", pid);
}

await mongoose.disconnect();
