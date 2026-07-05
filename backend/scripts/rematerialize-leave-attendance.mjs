/**
 * Recompute attendance for approved leave date ranges (fixes stale Present after leave approval).
 * Run: node scripts/rematerialize-leave-attendance.mjs [YYYY-MM-DD]
 */
import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import { leaveRequestsTable } from "../src/models/schema/hrm/leave.js";
import { usersTable } from "../src/models/schema/index.js";
import { materializeUserAttendanceDay } from "../src/services/hrm/attendance-materialize.service.js";
import { eachDateInRange, workDayKeyForDate, getHrmPolicyContext } from "../src/services/hrm/hrm-date-utils.js";

async function main() {
  await whenDatabaseReady();

  const { timezone } = await getHrmPolicyContext();
  const targetDate = process.argv[2] ?? workDayKeyForDate(new Date(), timezone);
  console.log(`Rematerializing attendance for approved leave covering ${targetDate}…`);

  const requests = await leaveRequestsTable.find({
    status: "approved",
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate },
  }).lean();

  if (!requests.length) {
    console.log("No approved leave requests for this date.");
    await mongoose.disconnect();
    return;
  }

  const userIds = [...new Set(requests.map((r) => r.userId))];
  const users = await usersTable.find({ id: { $in: userIds } }, { id: 1, name: 1 }).lean();
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  for (const req of requests) {
    for (const date of eachDateInRange(req.startDate, req.endDate)) {
      if (date !== targetDate) continue;
      const result = await materializeUserAttendanceDay(req.userId, date, {
        source: "engine",
      });
      console.log(
        `${nameById.get(req.userId) ?? req.userId} @ ${date}:`,
        JSON.stringify(result),
      );
    }
  }

  console.log("Done.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
