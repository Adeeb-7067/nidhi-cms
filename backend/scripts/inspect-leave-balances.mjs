/**
 * Read-only inspection. Does not modify data.
 * Run: node scripts/inspect-leave-balances.mjs
 */
import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection.db;

const collName =
  (await db.listCollections({ name: /leavebalance/i }).toArray()).map((c) => c.name)[0] ??
  "leavebalances";

const balances = await db
  .collection(collName)
  .find({
    $or: [
      { allocated: { $in: [10, 12, 15] } },
      { carriedForward: { $gte: 10 } },
    ],
  })
  .limit(30)
  .toArray();

console.log(`Collection: ${collName}, legacy-like rows: ${balances.length}`);
for (const b of balances) {
  console.log(
    JSON.stringify({
      userId: b.userId,
      leaveTypeId: b.leaveTypeId,
      year: b.year,
      allocated: b.allocated,
      carriedForward: b.carriedForward,
      used: b.used,
      pending: b.pending,
    }),
  );
}

const users = await db
  .collection("users")
  .find({ leaveAvailable: { $gte: 10 } })
  .limit(10)
  .project({ id: 1, name: 1, leaveAvailable: 1, leaveBalance: 1 })
  .toArray();
console.log("Users leaveAvailable>=10:", JSON.stringify(users, null, 2));

await mongoose.disconnect();
