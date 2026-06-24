import {
  usersTable,
  departmentsTable,
  payrollRunsTable,
  payrollLinesTable,
  payrollSlipsTable,
  hrmAuditLogsTable,
  notificationsTable,
} from "../../models/schema/index.js";
import { leaveTypesTable, leaveRequestsTable } from "../../models/schema/hrm/leave.js";
import { wfhRequestsTable } from "../../models/schema/hrm/wfh.js";
import { salaryStructuresTable } from "../../models/schema/hrm/payroll.js";
import { isHrmAdminRole, hrmEmployeeRoles } from "../../constants/user-roles.js";
import { buildDashboardStatsFromSummaries, getAttendanceDailySummaries } from "./attendance.service.js";
import { loadFirstSessionStarts } from "./attendance-context.js";
import { listLeaveBalances } from "./leave.service.js";
import { listLeaveRequests } from "./leave.service.js";
import { listWfhRequests } from "./wfh.service.js";
import { getDirectReportIds, resolveScopedUserIds } from "./team-scope.js";
import { computeAvailableBalance } from "./leave-accrual.service.js";
import { isPresentLikeStatus } from "../../constants/attendance-status.js";
import { getHrmPolicyContext, workDayKeyForDate, minutesInTimezone } from "./hrm-date-utils.js";

const PENDING_PREVIEW_LIMIT = 8;

export function resolveDashboardView(role) {
  if (role === "super_admin" || isHrmAdminRole(role)) return "admin";
  if (role === "manager") return "manager";
  return "employee";
}

export function computeAttendanceMonthPct(summaries) {
  if (!summaries?.length) return 0;
  const workingDays = summaries.filter((s) => !["weekend", "holiday"].includes(s.status));
  if (workingDays.length === 0) return 0;
  const present = workingDays.filter((s) => isPresentLikeStatus(s.status)).length;
  return Math.round((present / workingDays.length) * 100);
}

const TODAY_STATUS_LABELS = {
  present: "Present",
  onsite: "Onsite",
  late: "Onsite",
  wfh: "WFH",
  absent: "Absent",
  on_leave: "On leave",
  half_day: "Half day",
};

/** Aggregate daily present/absent counts for trend charts (working days only). */
export function buildAttendanceTrendPoints(summaries) {
  const byDate = new Map();
  for (const s of summaries) {
    if (["weekend", "holiday"].includes(s.status)) continue;
    const row = byDate.get(s.date) ?? { date: s.date, present: 0, absent: 0 };
    if (isPresentLikeStatus(s.status)) row.present += 1;
    else if (s.status === "absent") row.absent += 1;
    byDate.set(s.date, row);
  }
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => {
      const d = new Date(`${row.date}T12:00:00`);
      return {
        date: row.date,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        present: row.present,
        absent: row.absent,
        count: row.present,
      };
    });
}

/** Donut / pipeline slices for today's attendance mix. */
export function buildTodayStatusBreakdown(summaries) {
  const counts = { present: 0, onsite: 0, late: 0, wfh: 0, absent: 0, on_leave: 0, half_day: 0 };
  for (const s of summaries) {
    const key = s.status === "late" ? "onsite" : s.status;
    if (counts[key] != null) counts[key] += 1;
  }
  return Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: TODAY_STATUS_LABELS[key] ?? key,
      value,
    }));
}

/** On-time rate among present-like statuses today (present vs late/onsite). */
export function computeOnTimeRatePct(todaySummaries) {
  const presentLike = (todaySummaries ?? []).filter((s) => isPresentLikeStatus(s.status));
  if (!presentLike.length) return null;
  const onTime = presentLike.filter((s) => s.status === "present").length;
  return Math.round((onTime / presentLike.length) * 100);
}

/** Average first clock-in time label from session start map. */
export function computeAverageClockInLabel(firstSessionMap, todayKey, timezone) {
  const mins = [];
  for (const [key, startedAt] of firstSessionMap.entries()) {
    if (!key.endsWith(`:${todayKey}`) || !startedAt) continue;
    mins.push(minutesInTimezone(startedAt, timezone));
  }
  if (!mins.length) return null;
  const avg = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
  const h24 = Math.floor(avg / 60);
  const m = avg % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function dobToUpcomingDate(dob, fromDate, year) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const candidate = new Date(Date.UTC(year, month, day));
  if (candidate < fromDate) return null;
  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { date: dateKey, candidate };
}

/** Upcoming employee birthdays within the next N days. */
export async function buildUpcomingBirthdays(scopeUserIds, daysAhead = 90) {
  const filter = {
    role: { $in: hrmEmployeeRoles },
    status: "active",
    dob: { $ne: null },
  };
  if (scopeUserIds?.length) filter.id = { $in: scopeUserIds };

  const employees = await usersTable
    .find(filter)
    .select({ id: 1, name: 1, employeeId: 1, dob: 1, avatarUrl: 1 })
    .lean();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + daysAhead);

  const results = [];
  for (const emp of employees) {
    let match = null;
    for (const year of [today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
      const row = dobToUpcomingDate(emp.dob, today, year);
      if (row && row.candidate <= end) {
        match = row;
        break;
      }
    }
    if (!match) continue;
    results.push({
      userId: emp.id,
      userName: emp.name,
      employeeId: emp.employeeId ?? null,
      avatarUrl: emp.avatarUrl ?? null,
      date: match.date,
    });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
}

async function countUnreadNotifications(userId) {
  return notificationsTable.countDocuments({ userId, isRead: false });
}

/** Approval queue slices for pipeline-style charts. */
export function buildApprovalPipeline(stats) {
  const rows = [
    { name: "Pending leave", value: stats?.pendingLeave ?? 0 },
    { name: "Pending WFH", value: stats?.pendingWfh ?? 0 },
    { name: "Corrections", value: stats?.pendingCorrections ?? 0 },
  ];
  return rows.filter((r) => r.value > 0);
}

function shiftDateKey(dateKey, days) {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function buildDashboardAnalyticsFromSummaries(rangeSummaries, todayKey) {
  const todaySummaries = rangeSummaries.filter((s) => s.date === todayKey);
  return {
    attendanceTrend: buildAttendanceTrendPoints(rangeSummaries),
    todayBreakdown: buildTodayStatusBreakdown(todaySummaries),
  };
}

async function enrichSummaryUsers(summaryRows, pickFields = (s) => s) {
  if (!summaryRows.length) return [];
  const users = await usersTable.find(
    { id: { $in: summaryRows.map((s) => s.userId) } },
    { id: 1, name: 1, employeeId: 1, avatarUrl: 1 },
  ).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  return summaryRows.map((s) => {
    const u = userMap.get(s.userId);
    return pickFields(s, u);
  });
}

async function buildOnLeaveTodayFromSummaries(todaySummaries) {
  const onLeave = todaySummaries.filter((s) => s.status === "on_leave");
  return enrichSummaryUsers(onLeave, (s, u) => ({
    userId: s.userId,
    userName: u?.name ?? s.userName ?? "Unknown",
    employeeId: u?.employeeId ?? s.employeeId ?? null,
    avatarUrl: u?.avatarUrl ?? null,
  }));
}

async function buildOnWfhTodayFromSummaries(todaySummaries) {
  const { settings } = await getHrmPolicyContext();
  if (settings.hrmGlobalWfhMode === true) {
    return [];
  }
  const onWfh = todaySummaries.filter((s) => s.status === "wfh");
  return enrichSummaryUsers(onWfh, (s, u) => ({
    userId: s.userId,
    userName: u?.name ?? s.userName ?? "Unknown",
    employeeId: u?.employeeId ?? s.employeeId ?? null,
    avatarUrl: u?.avatarUrl ?? null,
  }));
}

async function buildTodayAttendanceRowsFromSummaries(todaySummaries, todayKey) {
  const rows = todaySummaries.filter((s) => !["weekend", "holiday"].includes(s.status));
  if (!rows.length) return [];

  const userIds = [...new Set(rows.map((s) => s.userId))];
  const users = await usersTable.find(
    { id: { $in: userIds } },
    { id: 1, name: 1, employeeId: 1, avatarUrl: 1 },
  ).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const { timezone } = await getHrmPolicyContext();
  const firstSessionMap = await loadFirstSessionStarts(userIds, todayKey, todayKey, timezone);

  return rows
    .map((s) => {
      const u = userMap.get(s.userId);
      return {
        userId: s.userId,
        userName: u?.name ?? s.userName ?? "Unknown",
        employeeId: u?.employeeId ?? s.employeeId ?? null,
        avatarUrl: u?.avatarUrl ?? null,
        status: s.status,
        activeMinutes: s.activeMinutes,
        expectedMinutes: s.expectedMinutes,
        clockIn: (() => {
          const startedAt = firstSessionMap.get(`${s.userId}:${todayKey}`);
          return startedAt ? new Date(startedAt).toISOString() : null;
        })(),
      };
    })
    .sort((a, b) => a.userName.localeCompare(b.userName));
}

function filterSummariesByUserIds(summaries, userIds) {
  if (!userIds?.length) return summaries;
  const allowed = new Set(userIds);
  return summaries.filter((s) => allowed.has(s.userId));
}

function monthBoundsForDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { year, month, startDate, endDate };
}

async function buildOnLeaveTodayList(scopeUserIds) {
  const { timezone } = await getHrmPolicyContext();
  const today = workDayKeyForDate(new Date(), timezone);
  const { summaries } = await getAttendanceDailySummaries({
    startDate: today,
    endDate: today,
    userIds: scopeUserIds ?? undefined,
  });
  const onLeave = summaries.filter((s) => s.status === "on_leave");
  if (!onLeave.length) return [];

  const users = await usersTable.find(
    { id: { $in: onLeave.map((s) => s.userId) } },
    { id: 1, name: 1, employeeId: 1, avatarUrl: 1 },
  ).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  return onLeave.map((s) => {
    const u = userMap.get(s.userId);
    return {
      userId: s.userId,
      userName: u?.name ?? "Unknown",
      employeeId: u?.employeeId ?? null,
      avatarUrl: u?.avatarUrl ?? null,
    };
  });
}

async function buildOnWfhTodayList(scopeUserIds) {
  const { timezone } = await getHrmPolicyContext();
  const today = workDayKeyForDate(new Date(), timezone);
  const { summaries } = await getAttendanceDailySummaries({
    startDate: today,
    endDate: today,
    userIds: scopeUserIds ?? undefined,
  });
  const onWfh = summaries.filter((s) => s.status === "wfh");
  if (!onWfh.length) return [];

  const users = await usersTable.find(
    { id: { $in: onWfh.map((s) => s.userId) } },
    { id: 1, name: 1, employeeId: 1, avatarUrl: 1 },
  ).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  return onWfh.map((s) => {
    const u = userMap.get(s.userId);
    return {
      userId: s.userId,
      userName: u?.name ?? s.userName ?? "Unknown",
      employeeId: u?.employeeId ?? s.employeeId ?? null,
      avatarUrl: u?.avatarUrl ?? null,
    };
  });
}

export async function buildEmployeeStatusBreakdown() {
  const [active, inactive] = await Promise.all([
    usersTable.countDocuments({ role: { $in: hrmEmployeeRoles }, status: "active" }),
    usersTable.countDocuments({ role: { $in: hrmEmployeeRoles }, status: { $ne: "active" } }),
  ]);
  return [
    { name: "Active", value: active },
    { name: "Inactive", value: inactive },
  ].filter((r) => r.value > 0);
}

async function buildTodayAttendanceRows(scopeUserIds, todayKey) {
  const { summaries } = await getAttendanceDailySummaries({
    startDate: todayKey,
    endDate: todayKey,
    userIds: scopeUserIds ?? undefined,
  });
  const rows = summaries.filter((s) => !["weekend", "holiday"].includes(s.status));
  if (!rows.length) return [];

  const userIds = [...new Set(rows.map((s) => s.userId))];
  const users = await usersTable.find(
    { id: { $in: userIds } },
    { id: 1, name: 1, employeeId: 1, avatarUrl: 1 },
  ).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const { timezone } = await getHrmPolicyContext();
  const firstSessionMap = await loadFirstSessionStarts(userIds, todayKey, todayKey, timezone);

  return rows
    .map((s) => {
      const u = userMap.get(s.userId);
      const startedAt = firstSessionMap.get(`${s.userId}:${todayKey}`);
      return {
        userId: s.userId,
        userName: s.userName ?? u?.name ?? "Unknown",
        employeeId: s.employeeId ?? u?.employeeId ?? null,
        avatarUrl: u?.avatarUrl ?? null,
        status: s.status,
        activeMinutes: s.activeMinutes ?? 0,
        clockIn: startedAt ? new Date(startedAt).toISOString() : null,
      };
    })
    .sort((a, b) => a.userName.localeCompare(b.userName))
    .slice(0, 25);
}

export async function buildLeaveByTypeStats(scopeUserIds) {
  const year = new Date().getFullYear();
  const query = {
    status: "approved",
    startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
    ...(scopeUserIds?.length ? { userId: { $in: scopeUserIds } } : {}),
  };
  const [requests, types] = await Promise.all([
    leaveRequestsTable.find(query).lean(),
    leaveTypesTable.find({ status: "active" }).lean(),
  ]);
  const typeMap = new Map(types.map((t) => [t.id, t.name]));
  const counts = new Map();
  for (const r of requests) {
    const label = typeMap.get(r.leaveTypeId) ?? `Type #${r.leaveTypeId}`;
    counts.set(label, (counts.get(label) ?? 0) + (r.days ?? 1));
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export async function buildLeaveRequestStats(scopeUserIds) {
  const scope = scopeUserIds?.length ? { userId: { $in: scopeUserIds } } : {};
  const [pending, approved, rejected] = await Promise.all([
    leaveRequestsTable.countDocuments({ ...scope, status: "pending" }),
    leaveRequestsTable.countDocuments({ ...scope, status: "approved" }),
    leaveRequestsTable.countDocuments({ ...scope, status: "rejected" }),
  ]);
  return { pending, approved, rejected };
}

export async function buildWfhRequestStats(scopeUserIds) {
  const scope = scopeUserIds?.length ? { userId: { $in: scopeUserIds } } : {};
  const [pending, approved] = await Promise.all([
    wfhRequestsTable.countDocuments({ ...scope, status: "pending" }),
    wfhRequestsTable.countDocuments({ ...scope, status: "approved" }),
  ]);
  return { pending, approved };
}

export function buildNeedsAttention({ stats, payrollBanner }) {
  const items = [];
  if ((stats?.absentToday ?? 0) > 0) {
    items.push({ label: `${stats.absentToday} absent today`, href: "/hrm/attendance", tone: "warning" });
  }
  if ((stats?.pendingCorrections ?? 0) > 0) {
    items.push({
      label: `${stats.pendingCorrections} attendance correction${stats.pendingCorrections === 1 ? "" : "s"}`,
      href: "/hrm/attendance",
      tone: "warning",
    });
  }
  if ((stats?.pendingLeave ?? 0) > 0) {
    items.push({
      label: `${stats.pendingLeave} leave request${stats.pendingLeave === 1 ? "" : "s"} pending`,
      href: "/hrm/leave",
      tone: "info",
    });
  }
  if ((stats?.pendingWfh ?? 0) > 0) {
    items.push({
      label: `${stats.pendingWfh} WFH request${stats.pendingWfh === 1 ? "" : "s"} pending`,
      href: "/hrm/wfh",
      tone: "info",
    });
  }
  if (payrollBanner && !["finalized", "paid"].includes(payrollBanner.status)) {
    items.push({ label: "Payroll run not finalized", href: "/hrm/payroll", tone: "critical" });
  }
  return items.slice(0, 5);
}

async function buildTopEarners(limit = 5) {
  const structures = await salaryStructuresTable.find({ gross: { $gt: 0 } })
    .sort({ gross: -1 })
    .limit(limit)
    .lean();
  if (!structures.length) return [];
  const users = await usersTable.find(
    { id: { $in: structures.map((s) => s.userId) } },
    { id: 1, name: 1, employeeId: 1, avatarUrl: 1, designation: 1 },
  ).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  return structures.map((s, index) => {
    const u = userMap.get(s.userId);
    return {
      rank: index + 1,
      userId: s.userId,
      userName: u?.name ?? "Unknown",
      employeeId: u?.employeeId ?? null,
      avatarUrl: u?.avatarUrl ?? null,
      designation: u?.designation ?? null,
      gross: Math.round(s.gross ?? 0),
      net: Math.round(s.net ?? 0),
    };
  });
}

async function buildRecentActivity(limit = 8) {
  const logs = await hrmAuditLogsTable.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  if (!logs.length) return [];
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))];
  const actors = actorIds.length
    ? await usersTable.find({ id: { $in: actorIds } }, { id: 1, name: 1 }).lean()
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a.name]));
  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId ?? null,
    severity: log.severity,
    actorName: actorMap.get(log.actorId) ?? null,
    createdAt: log.createdAt?.toISOString?.() ?? null,
  }));
}

async function buildEmployeeSelfSummary(userId) {
  const now = new Date();
  const { startDate, endDate } = monthBoundsForDate(now);
  const { timezone } = await getHrmPolicyContext();
  const today = workDayKeyForDate(now, timezone);

  const [{ summaries }, balances] = await Promise.all([
    getAttendanceDailySummaries({ startDate, endDate, userIds: [userId] }),
    listLeaveBalances(userId, now.getFullYear()),
  ]);

  const userSummaries = summaries.filter((s) => s.userId === userId);
  const todayRow = userSummaries.find((s) => s.date === today);

  const leaveAvailableTotal = balances.reduce(
    (sum, b) =>
      sum +
      computeAvailableBalance({
        allocated: b.allocated,
        carriedForward: b.carriedForward,
        used: b.used,
        pending: b.pending,
      }),
    0,
  );

  const latestSlip = await payrollSlipsTable.findOne({ userId })
    .sort({ year: -1, month: -1 })
    .lean();
  let latestNetPay = latestSlip?.net ?? null;
  if (latestNetPay == null) {
    const latestLine = await payrollLinesTable.findOne({ userId })
      .sort({ payrollRunId: -1 })
      .lean();
    latestNetPay = latestLine?.net ?? null;
  }

  return {
    attendanceMonthPct: computeAttendanceMonthPct(userSummaries),
    activeMinutesToday: todayRow?.activeMinutes ?? 0,
    leaveAvailableTotal: Math.round(leaveAvailableTotal * 10) / 10,
    latestNetPay,
  };
}

async function buildDepartmentStrength() {
  const users = await usersTable.find(
    { role: { $in: hrmEmployeeRoles }, status: "active" },
    { departmentId: 1 },
  ).lean();
  const deptIds = [...new Set(users.map((u) => u.departmentId).filter(Boolean))];
  const depts = deptIds.length
    ? await departmentsTable.find({ id: { $in: deptIds } }, { id: 1, name: 1 }).lean()
    : [];
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));

  const counts = new Map();
  for (const u of users) {
    const key = u.departmentId ?? 0;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, count]) => ({
      departmentId: id === 0 ? null : id,
      name: id === 0 ? "Unassigned" : deptMap.get(id) ?? "Unknown",
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

async function buildPayrollBanner() {
  const run = await payrollRunsTable.findOne({})
    .sort({ year: -1, month: -1 })
    .lean();
  if (!run) return null;

  const lines = await payrollLinesTable.find({ payrollRunId: run.id }).lean();
  const totalGross = lines.reduce((sum, line) => sum + (line.gross ?? 0), 0);
  const totalNet = lines.reduce((sum, line) => sum + (line.net ?? 0), 0);
  const totalDeductions = lines.reduce(
    (sum, line) => sum + (line.deductions ?? 0) + (line.lopDeduction ?? 0),
    0,
  );
  const paidOut = run.status === "paid" ? totalNet : 0;
  const yetToPay = Math.max(0, totalNet - paidOut);
  const payrollProgressPct = totalNet > 0 ? Math.round((paidOut / totalNet) * 100) : 0;

  return {
    year: run.year,
    month: run.month,
    status: run.status,
    totalGross: Math.round(totalGross),
    totalNet: Math.round(totalNet),
    totalDeductions: Math.round(totalDeductions),
    paidOut: Math.round(paidOut),
    yetToPay: Math.round(yetToPay),
    payrollProgressPct,
    employeeCount: lines.length,
  };
}

async function buildDashboardInsights(todaySummaries, todayKey, userId) {
  const userIds = [...new Set(todaySummaries.map((s) => s.userId))];
  const { timezone } = await getHrmPolicyContext();
  const firstSessionMap =
    userIds.length > 0
      ? await loadFirstSessionStarts(userIds, todayKey, todayKey, timezone)
      : new Map();

  const [unreadAlerts] = await Promise.all([countUnreadNotifications(userId)]);

  return {
    averageClockIn: computeAverageClockInLabel(firstSessionMap, todayKey, timezone),
    onTimeRatePct: computeOnTimeRatePct(todaySummaries),
    unreadAlerts,
  };
}

function slimLeaveRequest(row) {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    startDate: row.startDate,
    endDate: row.endDate,
    days: row.days,
    status: row.status,
    leaveTypeName: row.leaveType?.name ?? row.leaveTypeName ?? null,
  };
}

function slimWfhRequest(row) {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
  };
}

export async function getHrmDashboard(req) {
  const view = resolveDashboardView(req.user.role);
  const scopeUserIds = await resolveScopedUserIds(req, undefined);
  const policy = await getHrmPolicyContext();
  const todayKey = workDayKeyForDate(new Date(), policy.timezone);
  const trendStart = shiftDateKey(todayKey, -29);

  const fetchUserIds = view === "employee" ? [req.user.id] : scopeUserIds ?? undefined;
  const { summaries: rangeSummaries } = await getAttendanceDailySummaries({
    startDate: trendStart,
    endDate: todayKey,
    userIds: fetchUserIds,
  });
  const todaySummaries = rangeSummaries.filter((s) => s.date === todayKey);

  const stats = await buildDashboardStatsFromSummaries(todaySummaries, scopeUserIds ?? undefined);
  const onLeaveScope = view === "manager" ? scopeUserIds : null;
  const onLeaveToday = await buildOnLeaveTodayFromSummaries(
    filterSummariesByUserIds(
      todaySummaries.filter((s) => s.status === "on_leave"),
      onLeaveScope ?? undefined,
    ),
  );
  const analytics = await buildDashboardAnalyticsFromSummaries(rangeSummaries, todayKey);

  const payload = {
    view,
    todayKey,
    stats,
    onLeaveToday,
    globalWfhMode: policy.settings.hrmGlobalWfhMode === true,
    analytics: {
      ...analytics,
      approvalPipeline: buildApprovalPipeline(stats),
    },
  };

  if (view === "employee") {
    payload.self = await buildEmployeeSelfSummary(req.user.id);
  }

  if (view === "manager") {
    const reportIds = await getDirectReportIds(req.user.id);
    const managerScope = reportIds.length ? [req.user.id, ...reportIds] : [req.user.id];
    const managerToday = filterSummariesByUserIds(todaySummaries, managerScope);
    const [leave, wfh, leaveByType, leaveRequestStats, wfhRequestStats, upcomingBirthdays, insights] =
      await Promise.all([
      listLeaveRequests({ userIds: reportIds, status: "pending" }),
      listWfhRequests({ userIds: reportIds, status: "pending" }),
      buildLeaveByTypeStats(managerScope),
      buildLeaveRequestStats(managerScope),
      buildWfhRequestStats(managerScope),
      buildUpcomingBirthdays(managerScope),
      buildDashboardInsights(managerToday, todayKey, req.user.id),
    ]);
    payload.onWfhToday = await buildOnWfhTodayFromSummaries(managerToday);
    payload.todayAttendance = await buildTodayAttendanceRowsFromSummaries(managerToday, todayKey);
    payload.leaveByType = leaveByType;
    payload.leaveRequestStats = leaveRequestStats;
    payload.wfhRequestStats = wfhRequestStats;
    payload.upcomingBirthdays = upcomingBirthdays;
    payload.insights = insights;
    payload.needsAttention = buildNeedsAttention({ stats, payrollBanner: null });
    if (reportIds.length) {
      payload.pendingApprovals = {
        leave: leave.slice(0, PENDING_PREVIEW_LIMIT).map(slimLeaveRequest),
        wfh: wfh.slice(0, PENDING_PREVIEW_LIMIT).map(slimWfhRequest),
      };
    } else {
      payload.pendingApprovals = { leave: [], wfh: [] };
    }
  }

  if (view === "admin") {
    const [
      leave,
      wfh,
      departmentStrength,
      payrollBanner,
      employeeStatus,
      leaveByType,
      leaveRequestStats,
      wfhRequestStats,
      topEarners,
      recentActivity,
      onWfhToday,
      todayAttendance,
      upcomingBirthdays,
      insights,
    ] = await Promise.all([
      listLeaveRequests({ status: "pending" }),
      listWfhRequests({ status: "pending" }),
      buildDepartmentStrength(),
      buildPayrollBanner(),
      buildEmployeeStatusBreakdown(),
      buildLeaveByTypeStats(null),
      buildLeaveRequestStats(null),
      buildWfhRequestStats(null),
      buildTopEarners(),
      buildRecentActivity(),
      buildOnWfhTodayFromSummaries(todaySummaries),
      buildTodayAttendanceRowsFromSummaries(todaySummaries, todayKey),
      buildUpcomingBirthdays(null),
      buildDashboardInsights(todaySummaries, todayKey, req.user.id),
    ]);
    payload.pendingApprovals = {
      leave: leave.slice(0, PENDING_PREVIEW_LIMIT).map(slimLeaveRequest),
      wfh: wfh.slice(0, PENDING_PREVIEW_LIMIT).map(slimWfhRequest),
    };
    payload.departmentStrength = departmentStrength;
    payload.payrollBanner = payrollBanner;
    payload.onWfhToday = onWfhToday;
    payload.todayAttendance = todayAttendance;
    payload.employeeStatus = employeeStatus;
    payload.leaveByType = leaveByType;
    payload.leaveRequestStats = leaveRequestStats;
    payload.wfhRequestStats = wfhRequestStats;
    payload.topEarners = topEarners;
    payload.recentActivity = recentActivity;
    payload.needsAttention = buildNeedsAttention({ stats, payrollBanner });
    payload.upcomingBirthdays = upcomingBirthdays;
    payload.insights = insights;
  }

  return payload;
}
