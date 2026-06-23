/**
 * Reset legacy auto-seeded leave balances (EL=15, CL=12, SL=10) to accrual-only zeros.
 *
 * ⚠️  LIVE DATABASE — do not run without explicit approval.
 * Prefer the automatic reconcile-on-read in leave-accrual.service.js instead.
 *
 * Run only when approved:
 *   CONFIRM_LIVE_DB=1 node scripts/fix-legacy-leave-balances.mjs
 */
import "dotenv/config";
import mongoose from "mongoose";
import { leaveTypesTable, leaveBalancesTable, usersTable } from "../src/models/schema/index.js";
import { reconcileUserLeaveBalances } from "../src/services/hrm/leave-accrual.service.js";

if (process.env.CONFIRM_LIVE_DB !== "1") {
  console.error(
    "Refusing to run: this script mutates leave_balances and users.\n" +
      "Reconciliation on API read is already enabled — no batch job needed.\n" +
      "If you still need a one-time fix, set CONFIRM_LIVE_DB=1 explicitly.",
  );
  process.exit(1);
}

await mongoose.connect(process.env.DATABASE_URL);
console.log("Connected. Fixing legacy leave balances...");

const types = await leaveTypesTable.find({ status: "active" }).lean();
const year = new Date().getFullYear();

const before = await leaveBalancesTable.countDocuments({
  year,
  allocated: { $in: [10, 12, 15] },
  used: 0,
  pending: 0,
});
console.log(`Rows with legacy allocation (10/12/15): ${before}`);

const userIds = await leaveBalancesTable.distinct("userId", { year });
let fixedUsers = 0;
for (const userId of userIds) {
  const changed = await reconcileUserLeaveBalances(userId, year);
  if (changed) fixedUsers += 1;
}

const after = await leaveBalancesTable.countDocuments({
  year,
  allocated: { $in: [10, 12, 15] },
  used: 0,
  pending: 0,
});

await usersTable.updateMany(
  { leaveAvailable: { $gt: 0 } },
  { $set: { leaveAvailable: 0, leaveBalance: 0 } },
);

// Re-sync from balances for active staff
for (const userId of userIds) {
  await reconcileUserLeaveBalances(userId, year);
}

console.log(`Fixed ${fixedUsers} users. Legacy rows remaining: ${after}`);
await mongoose.disconnect();
