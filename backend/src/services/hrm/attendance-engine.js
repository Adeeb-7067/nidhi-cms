/** Persisted daily attendance row sources. */
export { dailyAttendanceSources } from "../../constants/hrm-workflow.js";

import { normalizeAttendanceStatus } from "../../constants/attendance-status.js";
import { getDayOfWeek } from "./hrm-date-utils.js";

export { normalizeAttendanceStatus };

/** Minimum active clock time before a day counts as present (filters accidental clock-ins). */
export const MIN_ACTIVE_MINUTES_FOR_PRESENT = 5;

/** Default full-day target when no shift template applies on a working day (8 h). */
export const DEFAULT_WORKDAY_MINUTES = 480;
export const MISSING_CLOCK_OUT_STOP_REASONS = new Set([
  "day_ended",
  "client_disconnected",
  "session_expired",
  "system_sleep",
  "network_lost",
  "app_quit",
  "logout",
]);

/**
 * Working minutes expected when a half-day (or short) leave is also taken.
 * Full-day leave returns 0 — caller should treat as on_leave when no work logged.
 */
export function effectiveExpectedMinutes(expectedMinutes, leave) {
  if (!leave || !expectedMinutes) return expectedMinutes;
  const part = leave.dayPart ?? "full";
  if (part === "full") return 0;
  if (part === "first_half" || part === "second_half") return Math.round(expectedMinutes / 2);
  if (part === "short") return Math.round(expectedMinutes * 0.75);
  return expectedMinutes;
}

/** True when approved leave is partial (not a full-day block). */
export function isPartialLeaveDay(leave) {
  if (!leave) return false;
  const part = leave.dayPart ?? "full";
  return part !== "full";
}

/**
 * True if any session on the day was auto-closed (employee did not clock out manually).
 */
export function detectMissingClockOut(sessionsForDay = []) {
  return sessionsForDay.some(
    (s) =>
      s.endedAt &&
      s.stopReason &&
      s.stopReason !== "clock_out" &&
      s.stopReason !== "admin_terminated" &&
      MISSING_CLOCK_OUT_STOP_REASONS.has(s.stopReason),
  );
}

/**
 * Core status resolver for one employee-day.
 * Half-day leave + clock time produces a single combined record (partialLeave flag).
 *
 * Global WFH (Satyakabir): working days stay unmarked until clock-in; then WFH with no late penalties.
 * Approved individual WFH (global off): pre-mark as WFH before clock-in.
 */
export function resolveAttendanceStatus({
  date,
  weekendDays,
  holiday,
  leave,
  wfh,
  globalWfhMode,
  activeMinutes,
  expectedMinutes,
  threshold,
  firstSessionStart,
  shift,
  timezone,
  missingClockOut = false,
}) {
  const isWeekend = weekendDays.includes(getDayOfWeek(date));
  const partialLeave = isPartialLeaveDay(leave);

  if (holiday) {
    return { status: "holiday", compliance: "exempt", holidayId: holiday.id, missingClockOut: false };
  }

  // Approved leave with no meaningful clock → on leave (payroll uses leave balance vs LOP).
  if (leave && activeMinutes < MIN_ACTIVE_MINUTES_FOR_PRESENT) {
    return {
      status: "on_leave",
      compliance: "exempt",
      leaveRequestId: leave.id,
      partialLeave: partialLeave || undefined,
      leaveDayPart: partialLeave ? leave.dayPart : undefined,
      missingClockOut: false,
    };
  }

  // Simple rule: ≥5 min active clock time → Present for that day.
  if (activeMinutes >= MIN_ACTIVE_MINUTES_FOR_PRESENT) {
    let compliance = "met";
    if (expectedMinutes > 0 && activeMinutes < expectedMinutes - threshold) {
      compliance = "short";
    }
    return {
      status: "present",
      compliance,
      partialLeave: partialLeave || undefined,
      leaveDayPart: partialLeave ? leave?.dayPart : undefined,
      leaveRequestId: partialLeave ? leave?.id : undefined,
      wfhRequestId: wfh?.id ?? null,
      globalWfh: globalWfhMode ? true : undefined,
      missingClockOut,
    };
  }

  if (isWeekend) {
    return { status: "weekend", compliance: "exempt", missingClockOut: false };
  }

  return { status: "absent", compliance: "absent", missingClockOut: false };
}

export function applyCorrectionOverlay(summary, correction) {
  if (!correction) return summary;
  const next = {
    ...summary,
    corrected: true,
    correctionId: correction.id,
    source: "manual_correction",
  };
  if (correction.requestedStatus) {
    next.status = correction.requestedStatus;
    if (next.status === "late") next.status = "onsite";
    if (next.status === "short") next.status = "half_day";
  }
  if (correction.requestedActiveMinutes != null) {
    next.activeMinutes = correction.requestedActiveMinutes;
    next.varianceMinutes = next.activeMinutes - next.expectedMinutes;
    if (next.activeMinutes >= next.expectedMinutes - (next.threshold ?? 0)) {
      next.compliance = "met";
    } else if (next.activeMinutes > 0) {
      next.compliance = "short";
    } else {
      next.compliance = "absent";
    }
  }
  return next;
}

/** Map a persisted DailyAttendance document to the API summary shape. */
export function dailyAttendanceToSummary(row, userMeta = {}) {
  return {
    userId: row.userId,
    employeeId: userMeta.employeeId ?? null,
    userName: userMeta.userName ?? "Unknown",
    avatarUrl: userMeta.avatarUrl ?? null,
    departmentId: userMeta.departmentId ?? null,
    departmentName: userMeta.departmentName ?? null,
    date: row.date,
    timezone: row.timezone,
    status: normalizeAttendanceStatus(row.status),
    compliance: row.compliance,
    expectedMinutes: row.expectedMinutes,
    activeMinutes: row.activeMinutes,
    varianceMinutes: row.varianceMinutes,
    sessionCount: row.sessionCount,
    threshold: row.threshold,
    missingClockOut: row.missingClockOut ?? false,
    partialLeave: row.partialLeave ?? false,
    leaveDayPart: row.leaveDayPart ?? null,
    leaveRequestId: row.leaveRequestId ?? null,
    wfhRequestId: row.wfhRequestId ?? null,
    holidayId: row.holidayId ?? null,
    globalWfh: row.globalWfh ?? false,
    forgivenLate: row.forgivenLate ?? false,
    corrected: row.corrected ?? false,
    correctionId: row.correctionId ?? null,
    source: row.source ?? "engine",
    persisted: true,
    lockedForPayroll: row.lockedForPayroll ?? false,
  };
}

