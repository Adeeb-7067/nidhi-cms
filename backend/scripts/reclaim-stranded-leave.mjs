/**
 * Fold stranded prior leave-year EL into the current leave year for the first cycle.
 * Run: node scripts/reclaim-stranded-leave.mjs
 */
import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import { usersTable } from "../src/models/schema/index.js";
import { hrmEmployeeRoles } from "../src/constants/user-roles.js";
import { reclaimStrandedPriorYearAccrual } from "../src/modules/hrm/services/leave-accrual.service.js";

async function main() {
  await whenDatabaseReady();
  const staff = await usersTable
    .find({ role: { $in: hrmEmployeeRoles }, status: "active" }, { id: 1, name: 1, employeeId: 1 })
    .lean();

  let reclaimed = 0;
  let employees = 0;
  for (const user of staff) {
    const result = await reclaimStrandedPriorYearAccrual(user.id);
    if (result.reclaimed > 0) {
      employees += 1;
      reclaimed += result.reclaimed;
      console.log(
        `${user.employeeId ?? user.id} ${user.name}: +${result.reclaimed} into leave year ${result.leaveYear}`,
      );
    }
  }
  console.log(`Done. Reclaimed ${reclaimed} day(s) across ${employees} employee(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
