/** Persisted daily attendance row sources. */
export { dailyAttendanceSources } from "../../constants/hrm-workflow.js";

import { normalizeAttendanceStatus } from "../../constants/attendance-status.js";
import { getDayOfWeek, minutesInTimezone } from "./hrm-date-utils.js";

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

/** Parse a shift "HH:MM" start time into minutes since local midnight. */
function shiftStartMinutes(startTime) {
  if (!startTime || typeof startTime !== "string") return null;
  const [h, m] = startTime.split(":").map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * Decide whether a clock-in is late beyond the shift's grace window.
 * Compares the first clock-in (in the employee's work timezone) against
 * shift start + graceMinutesIn. Returns { late, lateMinutes }.
 * Safe no-op (not late) when the shift, start time, or clock-in is missing.
 */
export function computeLateInfo({ firstSessionStart, shift, timezone }) {
  if (!firstSessionStart || !shift) return { late: false, lateMinutes: 0 };
  const startMin = shiftStartMinutes(shift.startTime);
  if (startMin == null) return { late: false, lateMinutes: 0 };
  const grace = Number.isFinite(shift.graceMinutesIn) ? shift.graceMinutesIn : 0;
  const clockInMin = minutesInTimezone(firstSessionStart, timezone || "UTC");
  const lateMinutes = clockInMin - (startMin + grace);
  return lateMinutes > 0 ? { late: true, lateMinutes } : { late: false, lateMinutes: 0 };
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
 * Global WFH (Satyakabir): working days stay unmarked until clock-in; then WFH.
 * Shift punctuality still applies — a late clock-in is flagged even under global WFH.
 * Approved individual WFH (global off): pre-mark as WFH before clock-in; individual
 * WFH days are exempt from late penalties (no fixed office arrival).
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

  // Full-day approved leave always marks the day as on leave — even if the employee
  // clocked in before leave was approved (accidental / invalid clock-in).
  if (leave && !partialLeave) {
    return {
      status: "on_leave",
      compliance: "exempt",
      leaveRequestId: leave.id,
      missingClockOut: false,
    };
  }

  // Partial leave with no meaningful clock → on leave for the leave portion.
  if (leave && activeMinutes < MIN_ACTIVE_MINUTES_FOR_PRESENT) {
    return {
      status: "on_leave",
      compliance: "exempt",
      leaveRequestId: leave.id,
      partialLeave: true,
      leaveDayPart: leave.dayPart,
      missingClockOut: false,
    };
  }

  // Simple rule: ≥5 min active clock time → Present for that day.
  if (activeMinutes >= MIN_ACTIVE_MINUTES_FOR_PRESENT) {
    let compliance = "met";
    if (expectedMinutes > 0 && activeMinutes < expectedMinutes - threshold) {
      compliance = "short";
    }
    // Late clock-in is judged against the shift start + grace regardless of
    // Global WFH mode (companies running fully remote still enforce shift
    // punctuality). Only per-day exceptions are exempt: an individually approved
    // WFH day and partial-leave days have no fixed arrival, so they skip the
    // penalty. globalWfhMode intentionally does NOT skip late detection.
    const skipLate = !!wfh || partialLeave;
    const { late, lateMinutes } = skipLate
      ? { late: false, lateMinutes: 0 }
      : computeLateInfo({ firstSessionStart, shift, timezone });
    return {
      status: "present",
      compliance,
      late,
      lateMinutes,
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
    late: row.late ?? false,
    lateMinutes: row.lateMinutes ?? 0,
    forgivenLate: row.forgivenLate ?? false,
    corrected: row.corrected ?? false,
    correctionId: row.correctionId ?? null,
    source: row.source ?? "engine",
    persisted: true,
    lockedForPayroll: row.lockedForPayroll ?? false,
  };
}

