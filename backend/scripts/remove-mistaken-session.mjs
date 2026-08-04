/**
 * One-off: find/remove a mistaken work-session clock-in for an employee on a date.
 *
 * Usage:
 *   node --env-file=.env ./scripts/remove-mistaken-session.mjs "Asad" 2026-08-02
 *   node --env-file=.env ./scripts/remove-mistaken-session.mjs "Asad" 2026-08-02 --confirm
 */
import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import { usersTable, workSessionsTable } from "../src/models/schema/index.js";
import { getOrCreateSettings } from "../src/modules/settings/services/company-settings.js";
import {
  workDayKey,
  resolveWorkDayTimezone,
} from "../src/modules/monitoring/services/work-session-policy.js";
import { computeSessionDurations } from "../src/modules/monitoring/services/work-sessions.service.js";
import { dailyAttendanceTable } from "../src/modules/hrm/schema/daily-attendance.js";
import { materializeUserAttendanceDay } from "../src/modules/hrm/services/attendance-materialize.service.js";
import { EmployeeScreenshot } from "../src/modules/monitoring/schema/EmployeeScreenshot.js";

const nameQuery = process.argv[2];
const targetDate = process.argv[3];
const confirm = process.argv.includes("--confirm");

if (!nameQuery || !targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
  console.error(
    'Usage: node scripts/remove-mistaken-session.mjs "<name>" YYYY-MM-DD [--confirm]',
  );
  process.exit(1);
}

function summarize(session, tz) {
  const d = computeSessionDurations(session);
  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    isActive: session.isActive,
    stopReason: session.stopReason,
    workDay: workDayKey(session.startedAt, tz),
    activeHours: +(d.activeDurationMs / 3_600_000).toFixed(2),
    deviceInfo: session.deviceInfo ?? null,
  };
}

async function main() {
  await whenDatabaseReady();
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);

  const users = await usersTable
    .find({ name: new RegExp(nameQuery, "i") }, { id: 1, name: 1, email: 1, cmsRole: 1 })
    .lean();

  if (!users.length) {
    console.error(`No users matching /${nameQuery}/i`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("Matched users:", users);

  for (const user of users) {
    const windowStart = new Date(`${targetDate}T00:00:00.000Z`);
    windowStart.setUTCDate(windowStart.getUTCDate() - 1);
    const windowEnd = new Date(`${targetDate}T23:59:59.999Z`);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

    const nearby = await workSessionsTable
      .find({
        userId: user.id,
        startedAt: { $gte: windowStart, $lte: windowEnd },
      })
      .sort({ startedAt: 1 })
      .lean();

    const active = await workSessionsTable.find({ userId: user.id, isActive: true }).lean();

    const daySessions = nearby.filter((s) => workDayKey(s.startedAt, tz) === targetDate);
    // Mistaken overnight sessions: still active and started on the target work day
    const mistakenActive = active.filter((s) => workDayKey(s.startedAt, tz) === targetDate);
    const toRemoveMap = new Map();
    for (const s of [...daySessions, ...mistakenActive]) toRemoveMap.set(s.id, s);
    const toRemove = [...toRemoveMap.values()];

    console.log(`\n=== ${user.name} (id=${user.id}) ===`);
    console.log("Nearby sessions:", nearby.map((s) => summarize(s, tz)));
    console.log("Active sessions:", active.map((s) => summarize(s, tz)));
    console.log("Will remove:", toRemove.map((s) => summarize(s, tz)));

    const attendance = await dailyAttendanceTable
      .find({ userId: user.id, date: { $in: [targetDate, workDayKey(new Date(), tz)] } })
      .lean();
    console.log(
      "Attendance rows:",
      attendance.map((a) => ({
        date: a.date,
        status: a.status,
        activeMinutes: a.activeMinutes,
        source: a.source,
      })),
    );

    if (!toRemove.length) {
      console.log("Nothing to remove for this user/date.");
      continue;
    }

    if (!confirm) {
      console.log("\nDry-run only. Re-run with --confirm to delete these sessions and rematerialize attendance.");
      continue;
    }

    const sessionIds = toRemove.map((s) => s.id);
    const shotResult = await EmployeeScreenshot.updateMany(
      { sessionId: { $in: sessionIds } },
      { $set: { sessionId: null } },
    );
    const delResult = await workSessionsTable.deleteMany({
      id: { $in: sessionIds },
      userId: user.id,
    });
    console.log(`Unlinked screenshots: ${shotResult.modifiedCount}`);
    console.log(`Deleted sessions: ${delResult.deletedCount}`);

    const remat = await materializeUserAttendanceDay(user.id, targetDate, { source: "engine" });
    console.log("Rematerialized attendance:", remat);

    // If an overnight session spilled into today, rematerialize today too
    const today = workDayKey(new Date(), tz);
    if (today !== targetDate) {
      const rematToday = await materializeUserAttendanceDay(user.id, today, { source: "engine" });
      console.log(`Rematerialized attendance for ${today}:`, rematToday);
    }
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
