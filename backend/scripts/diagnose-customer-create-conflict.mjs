/**
 * Diagnose POST /api/sales/customers 409 conflicts — sequence drift, email dupes, companyCode "".
 * Usage: node scripts/diagnose-customer-create-conflict.mjs [contactEmail]
 */
import mongoose from "mongoose";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!uri) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function maxId(collection, field = "id") {
  const row = await collection.find().sort({ [field]: -1 }).limit(1).project({ [field]: 1 }).toArray();
  return row[0]?.[field] ?? 0;
}

async function counterSeq(db, name) {
  const row = await db.collection("counters").findOne({ _id: name });
  return row?.seq ?? 0;
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const clients = db.collection("clients");
  const users = db.collection("users");

  const sequences = ["clients", "users", "credential_history", "direct_conversations", "comments"];
  console.log("\n=== Sequence vs max id ===");
  for (const name of sequences) {
    const collName =
      name === "credential_history"
        ? "credentialhistories"
        : name === "direct_conversations"
          ? "directconversations"
          : name;
    let max = 0;
    try {
      max = await maxId(db.collection(collName));
    } catch {
      try {
        max = await maxId(db.collection(name));
      } catch {
        max = -1;
      }
    }
    const seq = await counterSeq(db, name);
    const drift = max >= 0 && seq <= max ? `DRIFT (seq ${seq} <= max id ${max})` : "ok";
    console.log(`  ${name}: counter=${seq}, maxId≈${max} ${max >= 0 && seq <= max ? "⚠ " + drift : ""}`);
  }

  const emptyCodeCount = await clients.countDocuments({ companyCode: "" });
  if (emptyCodeCount > 0) {
    console.log(`\n⚠ clients with companyCode="" (sparse unique allows only one): ${emptyCodeCount}`);
  }

  const testEmail = process.argv[2]?.trim().toLowerCase();
  if (testEmail) {
    console.log(`\n=== Lookup for "${testEmail}" ===`);
    const client = await clients.findOne({ email: testEmail }, { projection: { id: 1, companyName: 1, assignedAdminId: 1, userId: 1 } });
    const user = await users.findOne({ email: testEmail }, { projection: { id: 1, role: 1, name: 1 } });
    console.log("  clients:", client ?? "none");
    console.log("  users:", user ?? "none");
  }

  console.log("\n=== Recent clients (last 5) ===");
  const recent = await clients.find().sort({ id: -1 }).limit(5).project({ id: 1, companyName: 1, email: 1, userId: 1, assignedAdminId: 1 }).toArray();
  for (const c of recent) console.log(`  #${c.id} ${c.companyName} <${c.email}> portalUser=${c.userId ?? "—"}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
