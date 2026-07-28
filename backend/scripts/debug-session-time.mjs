import "dotenv/config";
import mongoose from "mongoose";
import { workSessionsTable, usersTable } from "../src/models/schema/index.js";
import { computeSessionDurations, listDailySessionTotals } from "../src/modules/monitoring/services/work-sessions.service.js";
import { workDayKey, resolveWorkDayTimezone } from "../src/modules/monitoring/services/work-session-policy.js";
import { getOrCreateSettings } from "../src/modules/settings/services/company-settings.js";

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
await mongoose.connect(uri);
const settings = await getOrCreateSettings();
const tz = resolveWorkDayTimezone(settings.complianceTimezone);
const today = workDayKey(new Date(), tz);

function mins(ms) {
  return Math.round(ms / 60_000);
}

const active = await workSessionsTable.find({ isActive: true }).lean();
console.log("\n=== Active sessions: wall vs active (employee timer vs admin) ===\n");

for (const s of active) {
  const d = computeSessionDurations(s);
  const user = await usersTable.findOne({ id: s.userId }).lean();
  const daily = await listDailySessionTotals({ userId: s.userId, fromDate: today, toDate: today, limit: 5 });
  const row = daily.data[0];

  const wallH = (d.totalDurationMs / 3_600_000).toFixed(2);
  const activeH = (d.activeDurationMs / 3_600_000).toFixed(2);
  const dailyH = row ? (row.totalMs / 3_600_000).toFixed(2) : "—";

  // Flag large gap between wall (what wrong employee timer shows) and active
  const gapMin = mins(d.totalDurationMs - d.activeDurationMs);
  if (gapMin >= 30 || (parseFloat(wallH) > 5 && parseFloat(activeH) < 2)) {
    console.log({
      name: user?.name,
      userId: s.userId,
      employeeTimerWouldShow: `${wallH}h (wall clock)`,
      adminActiveSession: `${activeH}h`,
      adminDailyTotal: `${dailyH}h`,
      pausePeriods: s.pausePeriods?.length ?? 0,
      pauseMinutes: mins(d.pauseDurationMs),
      sessionsToday: row?.sessionCount,
    });
  }
}

await mongoose.disconnect();
