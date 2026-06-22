import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import { usersTable, departmentsTable, getNextSequence } from "../src/models/schema/index.js";

async function main() {
  await whenDatabaseReady();
  const users = await usersTable.find({ department: { $exists: true, $ne: null } }).lean();
  const nameToId = new Map();

  for (const user of users) {
    const name = String(user.department ?? "").trim();
    if (!name) continue;
    if (!nameToId.has(name)) {
      let dept = await departmentsTable.findOne({ name }).lean();
      if (!dept) {
        const id = await getNextSequence("departments");
        dept = await departmentsTable.create({ id, name, status: "active" });
        console.log(`Created department: ${name} (id=${id})`);
      }
      nameToId.set(name, dept.id);
    }
    if (!user.departmentId) {
      await usersTable.updateOne({ id: user.id }, { $set: { departmentId: nameToId.get(name) } });
    }
  }

  console.log(`Migrated ${nameToId.size} departments for ${users.length} users.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
