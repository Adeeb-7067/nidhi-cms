import {
  usersTable,
  dailyLogsTable,
  employeeScreenshotsTable,
  monitoringConsentsTable,
  workSessionsTable,
} from "../../../models/schema/index.js";
import { monitorableStaffRoles } from "../../../constants/user-roles.js";
import { listDailySessionTotals } from "./work-sessions.service.js";
import { getOrCreateSettings } from "../../settings/services/company-settings.js";
import { MISSING_CLOCK_OUT_STOP_REASONS } from "../../hrm/services/attendance-engine.js";

const WORKING_DAYS_PER_MONTH = 22;
const TARGET_HOURS_PER_DAY = 8;
const MONTHLY_CAPACITY_HOURS = WORKING_DAYS_PER_MONTH * TARGET_HOURS_PER_DAY;

function monthBounds(year, month) {
  const monthPattern = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${monthPattern}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${monthPattern}-${String(lastDay).padStart(2, "0")}`;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  return { startDate, endDate, monthStart, monthEnd, monthPattern };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function utilisationPct(hours) {
  if (!MONTHLY_CAPACITY_HOURS) return 0;
  return Math.min(100, Math.round((hours / MONTHLY_CAPACITY_HOURS) * 100));
}

function varianceFlag(clockHours, loggedHours) {
  if (clockHours <= 1) return false;
  const varianceHours = clockHours - loggedHours;
  const variancePct = Math.round((varianceHours / clockHours) * 100);
  return Math.abs(variancePct) > 20;
}

export async function getMonitoringAnalytics({ month, year }) {
  const { startDate, endDate, monthStart, monthEnd } = monthBounds(year, month);

  const staff = await usersTable
    .find({ role: { $in: monitorableStaffRoles } })
    .sort({ name: 1 })
    .lean();

  const staffIds = staff.map((u) => u.id);
  if (!staffIds.length) {
    return emptyAnalytics(month, year);
  }

  const settings = await getOrCreateSettings();

  const [
    sessionTotals,
    logAgg,
    screenshotAgg,
    consentRows,
    autoCloseAgg,
    activeSessions,
    dailyClockHeatmap,
  ] = await Promise.all([
    listDailySessionTotals({
      userIds: staffIds,
      fromDate: startDate,
      toDate: endDate,
      allRows: true,
    }),
    dailyLogsTable.aggregate([
      {
        $match: {
          developerId: { $in: staffIds },
          logDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$developerId",
          totalHours: { $sum: "$hoursSpent" },
          logEntries: { $sum: 1 },
        },
      },
    ]),
    employeeScreenshotsTable.aggregate([
      {
        $match: {
          userId: { $in: staffIds },
          takenAt: { $gte: monthStart, $lt: monthEnd },
        },
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    monitoringConsentsTable
      .find({ userId: { $in: staffIds } }, { userId: 1, consentGivenAt: 1, consentVersion: 1 })
      .lean(),
    workSessionsTable.aggregate([
      {
        $match: {
          userId: { $in: staffIds },
          startedAt: { $gte: monthStart, $lt: monthEnd },
          isActive: false,
          stopReason: { $in: [...MISSING_CLOCK_OUT_STOP_REASONS] },
        },
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    workSessionsTable.countDocuments({ isActive: true }),
    workSessionsTable.aggregate([
      {
        $match: {
          userId: { $in: staffIds },
          startedAt: { $gte: monthStart, $lt: monthEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$startedAt" },
          },
          sessionCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const clockByUser = new Map();
  const daysClockedByUser = new Map();
  const lastClockByUser = new Map();
  const sessionCountByUser = new Map();

  for (const row of sessionTotals.data ?? []) {
    const prev = clockByUser.get(row.userId) ?? 0;
    clockByUser.set(row.userId, prev + row.totalMs / 3_600_000);
    daysClockedByUser.set(row.userId, (daysClockedByUser.get(row.userId) ?? 0) + 1);
    const last = lastClockByUser.get(row.userId);
    if (!last || row.date > last) lastClockByUser.set(row.userId, row.date);
    sessionCountByUser.set(
      row.userId,
      (sessionCountByUser.get(row.userId) ?? 0) + (row.sessionCount ?? 0),
    );
  }

  const logByUser = new Map(
    logAgg.map((r) => [
      r._id,
      { totalHours: Number(r.totalHours) || 0, logEntries: r.logEntries ?? 0 },
    ]),
  );
  const screenshotsByUser = new Map(screenshotAgg.map((r) => [r._id, r.count]));
  const autoCloseByUser = new Map(autoCloseAgg.map((r) => [r._id, r.count]));

  const consentByUser = new Map(
    consentRows.map((c) => [
      c.userId,
      {
        hasConsent: !!c.consentGivenAt,
        isCurrent:
          !!c.consentGivenAt && c.consentVersion === settings.screenshotConsentVersion,
      },
    ]),
  );

  const employees = staff
    .map((user) => {
      const clockHours = round1(clockByUser.get(user.id) ?? 0);
      const loggedHours = round1(logByUser.get(user.id)?.totalHours ?? 0);
      const varianceHours = round1(clockHours - loggedHours);
      const variancePct =
        clockHours > 0 ? Math.round((varianceHours / clockHours) * 100) : 0;
      const consent = consentByUser.get(user.id) ?? { hasConsent: false, isCurrent: false };

      return {
        userId: user.id,
        name: user.name,
        employeeId: user.employeeId ?? null,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        status: user.status,
        clockHours,
        loggedHours,
        varianceHours,
        variancePct,
        clockUtilisationPct: utilisationPct(clockHours),
        logUtilisationPct: utilisationPct(loggedHours),
        sessionCount: sessionCountByUser.get(user.id) ?? 0,
        daysClocked: daysClockedByUser.get(user.id) ?? 0,
        logEntriesCount: logByUser.get(user.id)?.logEntries ?? 0,
        autoClosedSessions: autoCloseByUser.get(user.id) ?? 0,
        screenshotCount: screenshotsByUser.get(user.id) ?? 0,
        hasConsent: consent.hasConsent,
        consentCurrent: consent.isCurrent,
        lastClockDate: lastClockByUser.get(user.id) ?? null,
        flagged: varianceFlag(clockHours, loggedHours),
      };
    })
    .sort((a, b) => b.clockHours - a.clockHours);

  const activeStaff = staff.filter((u) => u.status === "active").length;
  const withConsent = employees.filter((e) => e.hasConsent && e.consentCurrent).length;
  const totalClockHours = round1(employees.reduce((s, e) => s + e.clockHours, 0));
  const totalLoggedHours = round1(employees.reduce((s, e) => s + e.loggedHours, 0));
  const avgClockUtilisation =
    employees.length > 0
      ? Math.round(
          employees.reduce((s, e) => s + e.clockUtilisationPct, 0) / employees.length,
        )
      : 0;
  const avgLogUtilisation =
    employees.length > 0
      ? Math.round(employees.reduce((s, e) => s + e.logUtilisationPct, 0) / employees.length)
      : 0;
  const flaggedVarianceCount = employees.filter((e) => e.flagged).length;
  const topContributor = employees[0] ?? null;
  const lowestAlignment = [...employees]
    .filter((e) => e.clockHours > 1)
    .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct))[0] ?? null;

  return {
    month,
    year,
    startDate,
    endDate,
    timezone: sessionTotals.timezone ?? "UTC",
    monthlyCapacityHours: MONTHLY_CAPACITY_HOURS,
    summary: {
      monitoredStaff: staff.length,
      activeStaff,
      inactiveStaff: staff.length - activeStaff,
      withConsent,
      pendingConsent: staff.length - withConsent,
      totalClockHours,
      totalLoggedHours,
      avgClockUtilisation,
      avgLogUtilisation,
      activeSessionsNow: activeSessions,
      flaggedVarianceCount,
      totalScreenshots: employees.reduce((s, e) => s + e.screenshotCount, 0),
      screenshotEnabled: settings.screenshotEnabled ?? false,
    },
    insights: {
      topContributor: topContributor
        ? {
            userId: topContributor.userId,
            name: topContributor.name,
            clockHours: topContributor.clockHours,
            clockUtilisationPct: topContributor.clockUtilisationPct,
          }
        : null,
      lowestAlignment: lowestAlignment
        ? {
            userId: lowestAlignment.userId,
            name: lowestAlignment.name,
            variancePct: lowestAlignment.variancePct,
            clockHours: lowestAlignment.clockHours,
            loggedHours: lowestAlignment.loggedHours,
          }
        : null,
    },
    employees,
    clockHeatmap: dailyClockHeatmap.map((r) => ({
      date: r._id,
      sessionCount: r.sessionCount,
    })),
  };
}

function emptyAnalytics(month, year) {
  const { startDate, endDate } = monthBounds(year, month);
  return {
    month,
    year,
    startDate,
    endDate,
    timezone: "UTC",
    monthlyCapacityHours: MONTHLY_CAPACITY_HOURS,
    summary: {
      monitoredStaff: 0,
      activeStaff: 0,
      inactiveStaff: 0,
      withConsent: 0,
      pendingConsent: 0,
      totalClockHours: 0,
      totalLoggedHours: 0,
      avgClockUtilisation: 0,
      avgLogUtilisation: 0,
      activeSessionsNow: 0,
      flaggedVarianceCount: 0,
      totalScreenshots: 0,
      screenshotEnabled: false,
    },
    insights: { topContributor: null, lowestAlignment: null },
    employees: [],
    clockHeatmap: [],
  };
}
