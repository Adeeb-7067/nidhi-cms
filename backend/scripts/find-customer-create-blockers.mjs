/** Find orphan client portal users and email overlaps blocking customer create. */
import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
await mongoose.connect(uri);
const db = mongoose.connection.db;
const clients = db.collection("clients");
const users = db.collection("users");

const clientUsers = await users.find({ role: "client" }).project({ id: 1, email: 1, name: 1 }).toArray();
const orphans = [];
for (const u of clientUsers) {
  const linked = await clients.findOne({ $or: [{ userId: u.id }, { email: u.email }] });
  if (!linked) orphans.push(u);
}

console.log(`Client-role users: ${clientUsers.length}`);
console.log(`Orphan portal users (no company row): ${orphans.length}`);
for (const u of orphans.slice(0, 15)) {
  console.log(`  user #${u.id} ${u.email} (${u.name})`);
}

const staffEmails = new Set(
  (await users.find({ role: { $ne: "client" } }).project({ email: 1 }).toArray()).map((u) => u.email?.toLowerCase()),
);

const clientEmails = await clients.find().project({ email: 1, companyName: 1, id: 1 }).toArray();
const overlapStaff = clientEmails.filter((c) => staffEmails.has(c.email?.toLowerCase()));
console.log(`\nCompanies whose contact email is also a staff login: ${overlapStaff.length}`);
for (const c of overlapStaff.slice(0, 10)) {
  console.log(`  #${c.id} ${c.companyName} <${c.email}>`);
}

await mongoose.disconnect();
