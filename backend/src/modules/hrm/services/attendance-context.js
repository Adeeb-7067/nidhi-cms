import { usersTable } from "../../../models/schema/index.js";
import { leaveRequestsTable } from "../schema/leave.js";
import { wfhRequestsTable } from "../schema/wfh.js";
import { attendanceCorrectionsTable } from "../schema/attendance.js";
import { workSessionsTable } from "../../monitoring/schema/WorkSession.js";
import { computeSessionDurations, queryWindowForDateRange } from "../../monitoring/services/work-sessions.service.js";
import { workDayKey } from "../../monitoring/services/work-session-policy.js";
import { eachDateInRange, getHrmPolicyContext } from "./hrm-date-utils.js";
import { getHolidaysForRange } from "./holidays.service.js";
import { buildShiftMapForRange, getDefaultShiftTemplate, resolveDefaultShiftTemplateId } from "./shifts.service.js";
import { hrmEmployeeRoles } from "../../../constants/user-roles.js";
import { detectMissingClockOut } from "./attendance-engine.js";

export async function loadApprovedLeaveMap(userIds, startDate, endDate) {
  const rows = await leaveRequestsTable.find({
    userId: { $in: userIds },
    status: "approved",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  }).lean();
  const map = new Map();
  for (const r of rows) {
    for (const d of eachDateInRange(r.startDate, r.endDate)) {
      map.set(`${r.userId}:${d}`, r);
    }
  }
  return map;
}

export async function loadApprovedWfhMap(userIds, startDate, endDate) {
  const rows = await wfhRequestsTable.find({
    userId: { $in: userIds },
    status: "approved",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  }).lean();
  const map = new Map();
  for (const r of rows) {
    for (const d of eachDateInRange(r.startDate, r.endDate)) {
      map.set(`${r.userId}:${d}`, r);
    }
  }
  return map;
}

export async function loadApprovedCorrectionsMap(userIds, startDate, endDate) {
  const rows = await attendanceCorrectionsTable.find({
    userId: { $in: userIds },
    status: "approved",
    date: { $gte: startDate, $lte: endDate },
  }).lean();
  return new Map(rows.map((r) => [`${r.userId}:${r.date}`, r]));
}

export async function loadFirstSessionStarts(userIds, startDate, endDate, timezone) {
  const { start, end } = queryWindowForDateRange(startDate, endDate);
  const sessions = await workSessionsTable
    .find({ userId: { $in: userIds }, startedAt: { $gte: start, $lte: end } })
    .sort({ startedAt: 1 })
    .lean();

  const map = new Map();
  for (const session of sessions) {
    const dayKey = workDayKey(session.startedAt, timezone);
    if (dayKey < startDate || dayKey > endDate) continue;
    const key = `${session.userId}:${dayKey}`;
    if (!map.has(key)) map.set(key, session.startedAt);
  }
  return map;
}

/** Sessions grouped by userId:date for missing-clock-out detection. */
export async function loadSessionsByUserDay(userIds, startDate, endDate, timezone) {
  const { start, end } = queryWindowForDateRange(startDate, endDate);
  const sessions = await workSessionsTable
    .find({ userId: { $in: userIds }, startedAt: { $gte: start, $lte: end } })
    .lean();
  const map = new Map();
  for (const session of sessions) {
    const dayKey = workDayKey(session.startedAt, timezone);
    if (dayKey < startDate || dayKey > endDate) continue;
    const key = `${session.userId}:${dayKey}`;
    const list = map.get(key) ?? [];
    list.push(session);
    map.set(key, list);
  }
  return map;
}

/**
 * Single fetch of the userId/date-range session window, deriving the three views
 * (per-day totals, first clock-in, sessions grouped by day) that buildAttendanceContext
 * needs — instead of issuing three separate range queries against workSessionsTable
 * for the same data.
 */
async function loadSessionWindowData(userIds, startDate, endDate, timezone) {
  const { start, end } = queryWindowForDateRange(startDate, endDate);
  const sessions = await workSessionsTable
    .find({ userId: { $in: userIds }, startedAt: { $gte: start, $lte: end } })
    .lean();

  const sessionsByUserDay = new Map();
  const firstSessionMap = new Map();
  const totalsByUserDay = new Map();

  for (const session of sessions) {
    const dayKey = workDayKey(session.startedAt, timezone);
    if (dayKey < startDate || dayKey > endDate) continue;
    const key = `${session.userId}:${dayKey}`;

    const daySessions = sessionsByUserDay.get(key) ?? [];
    daySessions.push(session);
    sessionsByUserDay.set(key, daySessions);

    const firstStart = firstSessionMap.get(key);
    if (!firstStart || new Date(session.startedAt) < new Date(firstStart)) {
      firstSessionMap.set(key, session.startedAt);
    }

    const totals = totalsByUserDay.get(key) ?? {
      userId: session.userId,
      date: dayKey,
      totalMs: 0,
      sessionCount: 0,
      hasActiveSession: false,
    };
    totals.totalMs += computeSessionDurations(session).activeDurationMs;
    totals.sessionCount += 1;
    if (session.isActive) totals.hasActiveSession = true;
    totalsByUserDay.set(key, totals);
  }

  return { sessionsByUserDay, firstSessionMap, totalsByUserDay };
}

export async function buildAttendanceContext({
  startDate,
  endDate,
  userIds: filterUserIds,
  departmentId,
}) {
  const { timezone, weekendDays, shortfallThreshold, defaultExpectedMinutes, settings } =
    await getHrmPolicyContext();
  const globalWfhMode = settings.hrmGlobalWfhMode === true;
  const maxFreeLates = settings.hrmMaxFreeLates ?? 0;

  let userQuery = { status: "active", role: { $in: hrmEmployeeRoles } };
  if (departmentId) userQuery.departmentId = departmentId;
  if (filterUserIds?.length) userQuery.id = { $in: filterUserIds };

  const users = await usersTable.find(userQuery, {
    id: 1, name: 1, employeeId: 1, departmentId: 1, department: 1, avatarUrl: 1,
  }).lean();
  const userIds = users.map((u) => u.id);

  if (!userIds.length) {
    return {
      users: [],
      userIds: [],
      timezone,
      weekendDays,
      shortfallThreshold,
      defaultExpectedMinutes,
      globalWfhMode,
      maxFreeLates,
      defaultShiftTemplate: null,
      sessionMap: new Map(),
      holidays: [],
      leaveMap: new Map(),
      wfhMap: new Map(),
      correctionMap: new Map(),
      firstSessionMap: new Map(),
      sessionsByUserDay: new Map(),
      shiftMap: new Map(),
    };
  }

  const [
    { sessionsByUserDay, firstSessionMap, totalsByUserDay },
    holidays,
    leaveMap,
    wfhMap,
    correctionMap,
    defaultShiftTemplate,
    shiftMap,
  ] = await Promise.all([
    loadSessionWindowData(userIds, startDate, endDate, timezone),
    getHolidaysForRange(startDate, endDate),
    loadApprovedLeaveMap(userIds, startDate, endDate),
    loadApprovedWfhMap(userIds, startDate, endDate),
    loadApprovedCorrectionsMap(userIds, startDate, endDate),
    getDefaultShiftTemplate(settings),
    resolveDefaultShiftTemplateId(settings).then((defaultTemplateId) =>
      buildShiftMapForRange(userIds, startDate, endDate, { defaultTemplateId, weekendDays }),
    ),
  ]);

  return {
    users,
    userIds,
    timezone,
    weekendDays,
    shortfallThreshold,
    defaultExpectedMinutes,
    globalWfhMode,
    maxFreeLates,
    defaultShiftTemplate,
    sessionMap: totalsByUserDay,
    holidays,
    leaveMap,
    wfhMap,
    correctionMap,
    firstSessionMap,
    sessionsByUserDay,
    shiftMap,
  };
}

export function minutesFromMs(ms) {
  return Math.round(ms / 60000);
}
