import { dailyLogsTable, usersTable, notificationsTable, getNextSequence } from "../../models/schema/index.js";
import { workSessionsTable } from "../../models/schema/WorkSession.js";
import { notifyUser, broadcast } from "../../lib/realtime.js";
import { runInTx } from "../../lib/db-tx.js";

import { dailyAttendanceTable } from "../../models/schema/hrm/daily-attendance.js";

import { leaveRequestsTable } from "../../models/schema/hrm/leave.js";

import { wfhRequestsTable } from "../../models/schema/hrm/wfh.js";

import { attendanceCorrectionsTable } from "../../models/schema/hrm/attendance.js";

import { buildAttendanceContext } from "./attendance-context.js";

import { isPresentLikeStatus, PRIMARY_ATTENDANCE_STATUSES } from "../../constants/attendance-status.js";
import { dailyAttendanceToSummary, detectMissingClockOut } from "./attendance-engine.js";

import { computeUserDaySummary, materializeUserAttendanceDay } from "./attendance-materialize.service.js";

import { eachDateInRange, getHrmPolicyContext, workDayKeyForDate, normalizeDateKey, zonedDateTimeToUtc } from "./hrm-date-utils.js";

import { logHrmAudit } from "./hrm-audit.service.js";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";
import { canUserReviewLeaveRequest } from "./leave-approval.js";
import { workDayKey } from "../work-session-policy.js";
import { queryWindowForDateRange } from "../work-sessions.service.js";



async function loadPersistedSummaries(userIds, startDate, endDate, userMetaById) {

  const rows = await dailyAttendanceTable.find({

    userId: { $in: userIds },

    date: { $gte: startDate, $lte: endDate },

  }).lean();



  return new Map(

    rows.map((r) => [

      `${r.userId}:${r.date}`,

      dailyAttendanceToSummary(r, userMetaById.get(r.userId)),

    ]),

  );

}



function enrichSummaryWithSessionClocks(summary, ctx, userId, date) {
  const firstSessionStart = ctx.firstSessionMap.get(`${userId}:${date}`);
  const daySessions = ctx.sessionsByUserDay.get(`${userId}:${date}`) ?? [];
  if (!firstSessionStart && daySessions.length === 0) return summary;

  const lastSession = daySessions.length > 0
    ? [...daySessions].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt)).at(-1)
    : null;

  return {
    ...summary,
    firstClockIn: firstSessionStart
      ? new Date(firstSessionStart).toISOString()
      : summary.firstClockIn ?? null,
    lastClockOut: lastSession?.endedAt
      ? new Date(lastSession.endedAt).toISOString()
      : summary.lastClockOut ?? null,
    missingClockOut: summary.missingClockOut ?? detectMissingClockOut(daySessions),
  };
}

async function loadSessionsForUserDay(userId, date, timezone) {
  const { start, end } = queryWindowForDateRange(date, date);
  const sessions = await workSessionsTable
    .find({ userId, startedAt: { $gte: start, $lte: end } })
    .sort({ startedAt: 1 })
    .lean();
  return sessions.filter((s) => workDayKey(s.startedAt, timezone) === date);
}

/** Create or update work sessions when HR records a manual clock-in/out. */
async function recordAdminManualClockSessions(userId, date, body, timezone) {
  const { badRequest } = await import("../../utils/route-errors.js");
  const mode = body.mode;
  const clockIn = body.clockIn?.trim() || null;
  const clockOut = body.clockOut?.trim() || null;

  if (mode === "clock_in") {
    if (!clockIn) badRequest("Clock-in time is required.");
    const startedAt = zonedDateTimeToUtc(date, clockIn, timezone);
    if (!startedAt) badRequest("Invalid clock-in time.");

    await workSessionsTable.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false, endedAt: startedAt, stopReason: "admin_manual" } },
    );

    const endedAt = clockOut ? zonedDateTimeToUtc(date, clockOut, timezone) : null;
    if (clockOut && !endedAt) badRequest("Invalid clock-out time.");
    if (endedAt && endedAt <= startedAt) badRequest("Clock-out time must be after clock-in time.");

    const id = await getNextSequence("workSession");
    await workSessionsTable.create({
      id,
      userId,
      startedAt,
      endedAt: endedAt ?? null,
      isActive: !endedAt,
      stopReason: endedAt ? "admin_manual" : null,
      lastHeartbeatAt: endedAt ?? startedAt,
      pausePeriods: [],
      deviceInfo: "admin_manual",
    });
    return;
  }

  if (mode === "clock_out") {
    if (!clockOut) badRequest("Clock-out time is required.");
    const endedAt = zonedDateTimeToUtc(date, clockOut, timezone);
    if (!endedAt) badRequest("Invalid clock-out time.");

    const active = await workSessionsTable.findOne({ userId, isActive: true }).lean();
    if (active) {
      if (endedAt <= new Date(active.startedAt)) {
        badRequest("Clock-out time must be after the session start.");
      }
      await workSessionsTable.findOneAndUpdate(
        { id: active.id, userId, isActive: true },
        { $set: { isActive: false, endedAt, stopReason: "admin_manual" } },
      );
      return;
    }

    const daySessions = await loadSessionsForUserDay(userId, date, timezone);
    const openSession = [...daySessions].reverse().find((s) => !s.endedAt || s.isActive);
    const target = openSession ?? daySessions.at(-1);
    if (!target) badRequest("No work session found for this date to clock out.");

    if (endedAt <= new Date(target.startedAt)) {
      badRequest("Clock-out time must be after the session start.");
    }

    await workSessionsTable.findOneAndUpdate(
      { id: target.id, userId },
      { $set: { isActive: false, endedAt, stopReason: "admin_manual" } },
    );
  }
}



export async function getAttendanceDailySummaries({

  startDate,

  endDate,

  userIds: filterUserIds,

  departmentId,

}) {

  const ctx = await buildAttendanceContext({ startDate, endDate, userIds: filterUserIds, departmentId });

  if (!ctx.userIds.length) {

    return { summaries: [], timezone: ctx.timezone, startDate, endDate };

  }



  const userMetaById = new Map(

    ctx.users.map((u) => [u.id, {

      userName: u.name,

      employeeId: u.employeeId,

      departmentId: u.departmentId,

      departmentName: u.department,

    }]),

  );



  const persistedMap = await loadPersistedSummaries(ctx.userIds, startDate, endDate, userMetaById);



  const summaries = [];

  const dates = eachDateInRange(startDate, endDate);

  const lateForgiven = new Map();



  for (const user of ctx.users) {

    for (const date of dates) {

      const key = `${user.id}:${date}`;

      const persisted = persistedMap.get(key);



      // Payroll-locked and manual corrections stay as stored; engine rows always recompute (shift-aware expected hours).
      if (
        persisted &&
        (
          persisted.lockedForPayroll ||
          persisted.source === "admin_override" ||
          persisted.source === "manual_correction"
        )
      ) {

        summaries.push(enrichSummaryWithSessionClocks(persisted, ctx, user.id, date));

        continue;

      }



      summaries.push(await computeUserDaySummary(user, date, ctx, lateForgiven));

    }

  }



  return { summaries, timezone: ctx.timezone, startDate, endDate };

}



export async function getAttendanceVsLogsVariance(userId, startDate, endDate) {

  const { summaries } = await getAttendanceDailySummaries({

    startDate,

    endDate,

    userIds: [userId],

  });

  const logs = await dailyLogsTable.find({

    developerId: userId,

    logDate: { $gte: startDate, $lte: endDate },

  }).lean();

  const logByDate = new Map();

  for (const l of logs) {

    logByDate.set(l.logDate, (logByDate.get(l.logDate) ?? 0) + (l.hoursSpent ?? 0));

  }

  return summaries.map((s) => {

    const loggedHours = logByDate.get(s.date) ?? 0;

    const clockHours = s.activeMinutes / 60;

    const varianceHours = clockHours - loggedHours;

    const variancePct = clockHours > 0 ? Math.round((varianceHours / clockHours) * 100) : 0;

    return {

      ...s,

      loggedHours,

      clockHours: Math.round(clockHours * 100) / 100,

      varianceHours: Math.round(varianceHours * 100) / 100,

      variancePct,

      flagged: Math.abs(variancePct) > 20 && clockHours > 1,

    };

  });

}



export async function listCorrections(userIds) {

  const query = userIds?.length ? { userId: { $in: userIds } } : {};

  return attendanceCorrectionsTable.find(query).sort({ createdAt: -1 }).lean();

}



export async function applyCorrection(userId, body, actorId) {

  const { getNextSequence } = await import("../../models/schema/index.js");
  const { badRequest, conflict } = await import("../../utils/route-errors.js");

  const date = normalizeDateKey(body.date);
  if (!date) badRequest("Valid date is required.");
  if (!body.reason?.trim()) badRequest("Reason is required.");
  if (!body.requestedStatus && body.requestedActiveMinutes == null) {
    badRequest("At least one of requestedStatus or requestedActiveMinutes is required.");
  }

  const locked = await dailyAttendanceTable
    .findOne({ userId, date, lockedForPayroll: true })
    .lean();
  if (locked) conflict("Attendance for this date is locked for payroll.");

  const pendingDuplicate = await attendanceCorrectionsTable
    .findOne({ userId, date, status: "pending" })
    .lean();
  if (pendingDuplicate) conflict("A pending correction already exists for this date.");

  const id = await getNextSequence("attendance_corrections");

  const row = await attendanceCorrectionsTable.create({

    id,

    userId,

    date,

    reason: body.reason.trim(),

    requestedStatus: body.requestedStatus ?? null,

    requestedActiveMinutes: body.requestedActiveMinutes ?? null,

    status: "pending",

  });

  await logHrmAudit({

    actorId,

    action: "attendance_correction_requested",

    entityType: "attendance_correction",

    entityId: id,

    severity: "info",

    metadata: { userId, date },

  });

  return row;

}



export async function reviewCorrection(id, { status, reviewNote }, reviewerId) {

  const { notFound, conflict, forbidden, badRequest } = await import("../../utils/route-errors.js");

  const row = await attendanceCorrectionsTable.findOne({ id });

  if (!row) notFound("Correction");

  if (row.status !== "pending") conflict("Not pending.");

  if (reviewerId === row.userId) conflict("You cannot approve your own correction request.");

  const reviewer = await usersTable.findOne({ id: reviewerId }, { id: 1, role: 1 }).lean();
  if (!reviewer) notFound("Reviewer");
  const requester = await usersTable
    .findOne({ id: row.userId }, { id: 1, reportingManagerId: 1 })
    .lean();
  if (!requester) notFound("Employee");
  if (!canUserReviewLeaveRequest(reviewer, requester)) {
    forbidden("You are not authorized to approve this attendance correction.");
  }
  if (!["approved", "rejected", "cancelled"].includes(status)) {
    badRequest("Invalid review status.");
  }

  if (status === "approved") {
    const locked = await dailyAttendanceTable
      .findOne({ userId: row.userId, date: row.date, lockedForPayroll: true })
      .lean();
    if (locked) conflict("Attendance for this date is locked for payroll.");
  }

  const updated = await runInTx(async (session) => {
    let query = attendanceCorrectionsTable.findOneAndUpdate(
      { id, status: "pending" },
      { $set: { status, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: reviewNote ?? null } },
      { new: true },
    );
    if (session) query = query.session(session);
    const approvedRow = await query;
    if (!approvedRow) conflict("Correction is no longer pending.");

    if (status === "approved") {
      const materialized = await materializeUserAttendanceDay(row.userId, row.date, {
        source: "manual_correction",
        correction: approvedRow.toObject?.() ?? approvedRow,
      });
      if (materialized?.skipped === "locked_for_payroll") {
        conflict("Attendance for this date is locked for payroll.");
      }
    }

    return approvedRow;
  });

  const notifId = await getNextSequence("notifications");
  await notificationsTable.create({
    id: notifId,
    userId: row.userId,
    type: "hrm_attendance",
    title: `Attendance correction ${status}`,
    body: `Your correction for ${row.date} was ${status}.`,
    entityType: "attendance_correction",
    entityId: id,
    isRead: false,
  });
  notifyUser(row.userId, "notification", { type: "hrm_attendance", title: `Correction ${status}` });
  broadcast("hrm_attendance_updated", { id });

  await logHrmAudit({

    actorId: reviewerId,

    action: status === "approved" ? "attendance_correction_approved" : "attendance_correction_rejected",

    entityType: "attendance_correction",

    entityId: id,

    severity: "info",

    metadata: { userId: row.userId, date: row.date, status },

  });

  return updated;

}



export async function buildDashboardStatsFromSummaries(todaySummaries, scopeUserIds) {
  const present = todaySummaries.filter((s) => isPresentLikeStatus(s.status)).length;
  const absent = todaySummaries.filter((s) => s.status === "absent").length;
  const onLeave = todaySummaries.filter((s) => s.status === "on_leave").length;

  const pendingQuery = scopeUserIds?.length ? { userId: { $in: scopeUserIds } } : {};
  const [pendingLeave, pendingWfh, pendingCorrections, headcount] = await Promise.all([
    leaveRequestsTable.countDocuments({ ...pendingQuery, status: "pending" }),
    wfhRequestsTable.countDocuments({ ...pendingQuery, status: "pending" }),
    attendanceCorrectionsTable.countDocuments({ ...pendingQuery, status: "pending" }),
    scopeUserIds?.length
      ? Promise.resolve(scopeUserIds.length)
      : usersTable.countDocuments({ role: { $in: hrmEmployeeRoles }, status: "active" }),
  ]);

  return {
    presentToday: present,
    absentToday: absent,
    onLeaveToday: onLeave,
    pendingLeave,
    pendingWfh,
    pendingCorrections,
    headcount,
  };
}

export async function getDashboardStats(scopeUserIds) {

  const today = workDayKeyForDate(new Date(), (await getHrmPolicyContext()).timezone);

  const { summaries } = await getAttendanceDailySummaries({

    startDate: today,

    endDate: today,

    userIds: scopeUserIds ?? undefined,

  });

  return buildDashboardStatsFromSummaries(summaries, scopeUserIds ?? undefined);

}



export async function getOrgVarianceReport({ startDate, endDate, departmentId, userIds }) {

  const { summaries } = await getAttendanceDailySummaries({

    startDate,

    endDate,

    userIds,

    departmentId,

  });

  const userIdSet = [...new Set(summaries.map((s) => s.userId))];

  const logs = await dailyLogsTable.find({

    developerId: { $in: userIdSet },

    logDate: { $gte: startDate, $lte: endDate },

  }).lean();

  const logByUserDate = new Map();

  for (const l of logs) {

    const key = `${l.developerId}:${l.logDate}`;

    logByUserDate.set(key, (logByUserDate.get(key) ?? 0) + (l.hoursSpent ?? 0));

  }



  const rows = summaries.map((s) => {

    const loggedHours = logByUserDate.get(`${s.userId}:${s.date}`) ?? 0;

    const clockHours = s.activeMinutes / 60;

    const varianceHours = clockHours - loggedHours;

    const variancePct = clockHours > 0 ? Math.round((varianceHours / clockHours) * 100) : 0;

    return {

      ...s,

      loggedHours,

      clockHours: Math.round(clockHours * 100) / 100,

      varianceHours: Math.round(varianceHours * 100) / 100,

      variancePct,

      flagged: Math.abs(variancePct) > 20 && clockHours > 1,

    };

  });



  return {

    rows,

    flaggedCount: rows.filter((r) => r.flagged).length,

  };

}

function complianceForAdminOverride(status, activeMinutes, expectedMinutes, threshold = 0) {
  if (["on_leave", "weekend", "holiday"].includes(status)) return "exempt";
  if (status === "absent") return "absent";
  if (activeMinutes >= expectedMinutes - threshold) return "met";
  if (activeMinutes > 0) return "short";
  return "absent";
}

async function loadUserMeta(userId) {
  const user = await usersTable
    .findOne({ id: userId }, { id: 1, name: 1, employeeId: 1, departmentId: 1, department: 1 })
    .lean();
  if (!user) {
    const { notFound } = await import("../../utils/route-errors.js");
    notFound("Employee");
  }
  return {
    userName: user.name,
    employeeId: user.employeeId ?? null,
    departmentId: user.departmentId ?? null,
    departmentName: user.department ?? null,
  };
}

async function resolveDaySummaryForAdmin(userId, date) {
  const ctx = await buildAttendanceContext({ startDate: date, endDate: date, userIds: [userId] });
  const user = ctx.users.find((u) => u.id === userId);
  if (!user) {
    const { notFound } = await import("../../utils/route-errors.js");
    notFound("Employee");
  }

  const persisted = await dailyAttendanceTable.findOne({ userId, date }).lean();
  const userMeta = {
    userName: user.name,
    employeeId: user.employeeId ?? null,
    departmentId: user.departmentId ?? null,
    departmentName: user.department ?? null,
  };
  if (persisted) {
    return { summary: dailyAttendanceToSummary(persisted, userMeta), userMeta };
  }

  const summary = await computeUserDaySummary(user, date, ctx, new Map());
  return { summary, userMeta };
}

async function upsertAdminAttendanceDoc(userId, date, fields, userMeta) {
  const { conflict } = await import("../../utils/route-errors.js");
  const existing = await dailyAttendanceTable.findOne({ userId, date }).lean();
  if (existing?.lockedForPayroll) {
    conflict("Attendance for this date is locked for payroll.");
  }

  const doc = {
    ...fields,
    source: "admin_override",
    materializedAt: new Date(),
  };

  if (existing) {
    await dailyAttendanceTable.updateOne({ id: existing.id }, { $set: doc });
    return dailyAttendanceToSummary({ ...existing, ...doc }, userMeta);
  }

  const id = await getNextSequence("daily_attendance");
  await dailyAttendanceTable.create({ id, userId, date, ...doc });
  return dailyAttendanceToSummary({ id, userId, date, ...doc }, userMeta);
}

/** HR excuses a late arrival (onsite → present with forgivenLate). */
export async function excuseLateArrival(userId, dateInput, { note }, actorId) {
  const { badRequest, conflict } = await import("../../utils/route-errors.js");
  const date = normalizeDateKey(dateInput);
  if (!date) badRequest("Valid date is required.");

  const { summary, userMeta } = await resolveDaySummaryForAdmin(userId, date);
  const status = summary.status;
  if (status !== "onsite") {
    badRequest("Only late onsite days can be excused.");
  }
  if (summary.forgivenLate) {
    conflict("Late arrival is already excused for this date.");
  }

  const result = await upsertAdminAttendanceDoc(
    userId,
    date,
    {
      timezone: summary.timezone,
      status: "present",
      compliance: summary.compliance === "short" ? "met" : summary.compliance,
      expectedMinutes: summary.expectedMinutes,
      activeMinutes: summary.activeMinutes,
      varianceMinutes: summary.varianceMinutes,
      sessionCount: summary.sessionCount,
      threshold: summary.threshold,
      missingClockOut: summary.missingClockOut ?? false,
      partialLeave: summary.partialLeave ?? false,
      leaveDayPart: summary.leaveDayPart ?? null,
      leaveRequestId: summary.leaveRequestId ?? null,
      wfhRequestId: summary.wfhRequestId ?? null,
      holidayId: summary.holidayId ?? null,
      globalWfh: summary.globalWfh ?? false,
      forgivenLate: true,
      corrected: summary.corrected ?? false,
      correctionId: summary.correctionId ?? null,
    },
    userMeta,
  );

  const notifId = await getNextSequence("notifications");
  await notificationsTable.create({
    id: notifId,
    userId,
    type: "hrm_attendance",
    title: "Late arrival excused",
    body: note?.trim()
      ? `Your late arrival on ${date} was excused. Note: ${note.trim()}`
      : `Your late arrival on ${date} was excused by HR.`,
    entityType: "daily_attendance",
    entityId: userId,
    isRead: false,
  });
  notifyUser(userId, "notification", { type: "hrm_attendance", title: "Late arrival excused" });
  broadcast("hrm_attendance_updated", { userId, date });

  await logHrmAudit({
    actorId,
    action: "attendance_late_excused",
    entityType: "daily_attendance",
    entityId: userId,
    severity: "info",
    metadata: { userId, date, note: note?.trim() || null },
  });

  return result;
}

/** HR manually sets attendance for one employee-day (admin override grid). */
export async function adminOverrideAttendance(userId, dateInput, body, actorId) {
  const { badRequest } = await import("../../utils/route-errors.js");
  const date = normalizeDateKey(dateInput);
  if (!date) badRequest("Valid date is required.");
  if (!body.reason?.trim()) badRequest("Reason is required.");
  if (!body.status || !PRIMARY_ATTENDANCE_STATUSES.includes(body.status)) {
    badRequest("Valid attendance status is required.");
  }

  let { summary, userMeta } = await resolveDaySummaryForAdmin(userId, date);
  let sessionCtx = null;

  if (body.mode === "clock_in" || body.mode === "clock_out") {
    await recordAdminManualClockSessions(userId, date, body, summary.timezone);
    sessionCtx = await buildAttendanceContext({ startDate: date, endDate: date, userIds: [userId] });
    const employee = sessionCtx.users.find((u) => u.id === userId);
    if (employee) {
      summary = await computeUserDaySummary(employee, date, sessionCtx, new Map());
    }
  }

  const activeMinutes =
    body.activeMinutes != null ? Number(body.activeMinutes) : summary.activeMinutes;
  if (!Number.isFinite(activeMinutes) || activeMinutes < 0) {
    badRequest("Active minutes must be a non-negative number.");
  }

  const threshold = summary.threshold ?? 0;
  const expectedMinutes = summary.expectedMinutes ?? 0;
  const compliance = complianceForAdminOverride(body.status, activeMinutes, expectedMinutes, threshold);

  const result = await upsertAdminAttendanceDoc(
    userId,
    date,
    {
      timezone: summary.timezone,
      status: body.status,
      compliance,
      expectedMinutes,
      activeMinutes,
      varianceMinutes: activeMinutes - expectedMinutes,
      sessionCount: summary.sessionCount ?? 0,
      threshold,
      missingClockOut: summary.missingClockOut ?? false,
      partialLeave: body.status === "half_day" ? true : summary.partialLeave ?? false,
      leaveDayPart: summary.leaveDayPart ?? null,
      leaveRequestId: summary.leaveRequestId ?? null,
      wfhRequestId: summary.wfhRequestId ?? null,
      holidayId: summary.holidayId ?? null,
      globalWfh: body.status === "wfh" ? true : summary.globalWfh ?? false,
      forgivenLate: summary.forgivenLate ?? false,
      corrected: false,
      correctionId: null,
    },
    userMeta,
  );

  const notifId = await getNextSequence("notifications");
  await notificationsTable.create({
    id: notifId,
    userId,
    type: "hrm_attendance",
    title: "Attendance adjusted",
    body: `Your attendance for ${date} was updated to ${body.status} by HR.`,
    entityType: "daily_attendance",
    entityId: userId,
    isRead: false,
  });
  notifyUser(userId, "notification", { type: "hrm_attendance", title: "Attendance adjusted" });
  broadcast("hrm_attendance_updated", { userId, date });

  await logHrmAudit({
    actorId,
    action: "attendance_admin_override",
    entityType: "daily_attendance",
    entityId: userId,
    severity: "info",
    metadata: {
      userId,
      date,
      status: body.status,
      activeMinutes,
      reason: body.reason.trim(),
      mode: body.mode ?? null,
      clockIn: body.clockIn ?? null,
      clockOut: body.clockOut ?? null,
    },
  });

  const freshCtx = sessionCtx ?? await buildAttendanceContext({ startDate: date, endDate: date, userIds: [userId] });
  return enrichSummaryWithSessionClocks(result, freshCtx, userId, date);
}


