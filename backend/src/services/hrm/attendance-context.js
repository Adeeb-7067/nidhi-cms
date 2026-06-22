import { usersTable } from "../../models/schema/index.js";
import { leaveRequestsTable } from "../../models/schema/hrm/leave.js";
import { wfhRequestsTable } from "../../models/schema/hrm/wfh.js";
import { attendanceCorrectionsTable } from "../../models/schema/hrm/attendance.js";
import { workSessionsTable } from "../../models/schema/WorkSession.js";
import { listDailySessionTotals, queryWindowForDateRange } from "../work-sessions.service.js";
import { workDayKey } from "../work-session-policy.js";
import { eachDateInRange, getHrmPolicyContext } from "./hrm-date-utils.js";
import { getHolidaysForRange } from "./holidays.service.js";
import { buildShiftMapForRange } from "./shifts.service.js";
import { staffEmployeeRoles } from "../../constants/user-roles.js";
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

  let userQuery = { status: "active", role: { $in: staffEmployeeRoles } };
  if (departmentId) userQuery.departmentId = departmentId;
  if (filterUserIds?.length) userQuery.id = { $in: filterUserIds };

  const users = await usersTable.find(userQuery, {
    id: 1, name: 1, employeeId: 1, departmentId: 1, department: 1,
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

  const sessionData = await listDailySessionTotals({
    fromDate: startDate,
    toDate: endDate,
    userIds,
    allRows: true,
  });

  const [holidays, leaveMap, wfhMap, correctionMap, firstSessionMap, sessionsByUserDay, shiftMap] =
    await Promise.all([
      getHolidaysForRange(startDate, endDate),
      loadApprovedLeaveMap(userIds, startDate, endDate),
      loadApprovedWfhMap(userIds, startDate, endDate),
      loadApprovedCorrectionsMap(userIds, startDate, endDate),
      loadFirstSessionStarts(userIds, startDate, endDate, timezone),
      loadSessionsByUserDay(userIds, startDate, endDate, timezone),
      buildShiftMapForRange(userIds, startDate, endDate, {
        defaultTemplateId: settings.hrmDefaultShiftTemplateId ?? null,
      }),
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
    sessionMap: new Map(sessionData.data.map((r) => [`${r.userId}:${r.date}`, r])),
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
