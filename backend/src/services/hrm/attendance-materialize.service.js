import { dailyAttendanceTable, getNextSequence } from "../../models/schema/index.js";
import { computeExpectedMinutes } from "./shifts.service.js";
import { buildAttendanceContext, minutesFromMs } from "./attendance-context.js";
import {
  resolveAttendanceStatus,
  applyCorrectionOverlay,
  detectMissingClockOut,
  DEFAULT_WORKDAY_MINUTES,
} from "./attendance-engine.js";
import { getDayOfWeek } from "./hrm-date-utils.js";
import { withJobLock } from "../jobs/withJobLock.js";
import { getOrCreateSettings } from "../company-settings.js";
import { resolveWorkDayTimezone } from "../work-session-policy.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { logger } from "../../lib/logger.js";
import { isDatabaseConnected } from "../../lib/db.js";

/** Local hour when nightly materialization runs (after work-day auto-close). */
export const ATTENDANCE_MATERIALIZE_RUN_HOUR = 3;

const JOB_TICK_MS = 5 * 60 * 1000;

/**
 * Compute one employee-day summary from a pre-built context (no DB except shift lookup).
 */
export async function computeUserDaySummary(user, date, ctx, lateForgiven) {
  const sess = ctx.sessionMap.get(`${user.id}:${date}`);
  const activeMinutes = minutesFromMs(sess?.totalMs ?? 0);
  const shift = ctx.shiftMap?.get(`${user.id}:${date}`) ?? null;
  const isWeekend = ctx.weekendDays.includes(getDayOfWeek(date));
  // Expected = assigned shift (or company default) end − start − break — per employee.
  const effectiveShift = shift ?? (!isWeekend ? ctx.defaultShiftTemplate : null);
  let expectedMinutes = computeExpectedMinutes(effectiveShift);
  if (!expectedMinutes && !isWeekend) {
    expectedMinutes = DEFAULT_WORKDAY_MINUTES;
  }

  const holiday = ctx.holidays.find((h) => {
    if (h.date !== date) return false;
    if (h.scope === "company") return true;
    return h.departmentIds?.includes(user.departmentId);
  }) ?? null;

  const leave = ctx.leaveMap.get(`${user.id}:${date}`);
  const wfh = ctx.wfhMap.get(`${user.id}:${date}`);
  const firstSessionStart = ctx.firstSessionMap.get(`${user.id}:${date}`) ?? null;
  const daySessions = ctx.sessionsByUserDay.get(`${user.id}:${date}`) ?? [];
  const missingClockOut = detectMissingClockOut(daySessions);

  let { status, compliance, ...refs } = resolveAttendanceStatus({
    date,
    weekendDays: ctx.weekendDays,
    holiday,
    leave,
    wfh,
    globalWfhMode: ctx.globalWfhMode,
    activeMinutes,
    expectedMinutes,
    threshold: ctx.shortfallThreshold,
    firstSessionStart,
    shift,
    timezone: ctx.timezone,
    missingClockOut,
  });

  if (status === "onsite" && ctx.maxFreeLates > 0) {
    const monthKey = `${user.id}:${date.slice(0, 7)}`;
    const forgiven = lateForgiven.get(monthKey) ?? 0;
    if (forgiven < ctx.maxFreeLates) {
      status = "present";
      refs.forgivenLate = true;
      lateForgiven.set(monthKey, forgiven + 1);
    }
  }

  let summary = {
    userId: user.id,
    employeeId: user.employeeId ?? null,
    userName: user.name,
    departmentId: user.departmentId ?? null,
    departmentName: user.department ?? null,
    date,
    timezone: ctx.timezone,
    status,
    compliance,
    expectedMinutes,
    activeMinutes,
    varianceMinutes: activeMinutes - expectedMinutes,
    sessionCount: sess?.sessionCount ?? 0,
    threshold: ctx.shortfallThreshold,
    missingClockOut,
    shiftName: effectiveShift?.name ?? null,
    ...refs,
  };

  return applyCorrectionOverlay(summary, ctx.correctionMap.get(`${user.id}:${date}`));
}

function summaryToPersistDoc(summary, source = "engine") {
  return {
    userId: summary.userId,
    date: summary.date,
    timezone: summary.timezone,
    status: summary.status,
    compliance: summary.compliance,
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
    forgivenLate: summary.forgivenLate ?? false,
    corrected: summary.corrected ?? false,
    correctionId: summary.correctionId ?? null,
    source: summary.source ?? source,
    materializedAt: new Date(),
  };
}

/** Upsert persisted rows for one calendar date (all active staff). */
export async function materializeAttendanceForDate(targetDate, { source = "engine" } = {}) {
  const outcome = await withJobLock("hrm_attendance_materialize", targetDate, async () => {
    const ctx = await buildAttendanceContext({ startDate: targetDate, endDate: targetDate });
    if (!ctx.userIds.length) return { targetDate, upserted: 0 };

    const lateForgiven = new Map();
    let upserted = 0;

    for (const user of ctx.users) {
      const summary = await computeUserDaySummary(user, targetDate, ctx, lateForgiven);
      const doc = summaryToPersistDoc(summary, source);
      const existing = await dailyAttendanceTable.findOne({ userId: user.id, date: targetDate }).lean();

      if (existing) {
        await dailyAttendanceTable.updateOne(
          { id: existing.id, lockedForPayroll: { $ne: true } },
          { $set: doc },
        );
      } else {
        const id = await getNextSequence("daily_attendance");
        await dailyAttendanceTable.create({ id, ...doc });
      }
      upserted += 1;
    }

    await logHrmAudit({
      actorId: null,
      action: "attendance_materialized",
      entityType: "daily_attendance",
      entityId: null,
      severity: "info",
      metadata: { targetDate, upserted, source },
    });

    return { targetDate, upserted, source };
  });

  return outcome;
}

/** Re-materialize a single employee-day (e.g. after correction approval). */
export async function materializeUserAttendanceDay(
  userId,
  targetDate,
  { source = "manual_correction", correction = null } = {},
) {
  const ctx = await buildAttendanceContext({
    startDate: targetDate,
    endDate: targetDate,
    userIds: [userId],
  });
  const user = ctx.users.find((u) => u.id === userId);
  if (!user) return null;

  let summary = await computeUserDaySummary(user, targetDate, ctx, new Map());
  if (correction) {
    summary = applyCorrectionOverlay(summary, correction);
  }
  const doc = summaryToPersistDoc(summary, source);
  const existing = await dailyAttendanceTable.findOne({ userId, date: targetDate }).lean();

  if (existing?.lockedForPayroll) {
    return { skipped: "locked_for_payroll", userId, targetDate };
  }

  if (existing) {
    await dailyAttendanceTable.updateOne({ id: existing.id }, { $set: doc });
    return { userId, targetDate, updated: true };
  }

  const id = await getNextSequence("daily_attendance");
  await dailyAttendanceTable.create({ id, ...doc });
  return { userId, targetDate, created: true };
}

function localDateParts(date, tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(date).split("-").map(Number);
  return { year: y, month: m, day: d, dateKey: fmt.format(date) };
}

function localHour(date, tz) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
    hourCycle: "h23",
  }).format(date);
  const parsed = Number.parseInt(hour, 10);
  return parsed === 24 ? 0 : parsed;
}

function previousDateKey(dateKey) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

let lastMaterializeRunKey = null;
let materializeTickInFlight = false;

/** Materialize yesterday's attendance once per day at ATTENDANCE_MATERIALIZE_RUN_HOUR. */
export async function runAttendanceMaterializeTick(now = new Date()) {
  if (!isDatabaseConnected()) {
    return { skipped: "database_unavailable" };
  }

  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const { dateKey: todayKey } = localDateParts(now, tz);
  const hour = localHour(now, tz);

  if (hour !== ATTENDANCE_MATERIALIZE_RUN_HOUR) {
    return { skipped: "outside_schedule", hour, timezone: tz };
  }

  const targetDate = previousDateKey(todayKey);
  const runKey = `${targetDate}:${ATTENDANCE_MATERIALIZE_RUN_HOUR}`;
  if (lastMaterializeRunKey === runKey) {
    return { skipped: "already_ran_in_process", runKey };
  }
  lastMaterializeRunKey = runKey;

  const outcome = await materializeAttendanceForDate(targetDate);
  logger.info({ targetDate, outcome }, "Attendance materialization tick completed");
  return { targetDate, timezone: tz, outcome };
}

export function _resetMaterializeTickStateForTests() {
  lastMaterializeRunKey = null;
  materializeTickInFlight = false;
}

export function startAttendanceMaterializeJob() {
  const tick = async () => {
    if (materializeTickInFlight) return;
    materializeTickInFlight = true;
    try {
      await runAttendanceMaterializeTick();
    } catch (err) {
      logger.error({ err }, "Attendance materialization job tick failed");
      lastMaterializeRunKey = null;
    } finally {
      materializeTickInFlight = false;
    }
  };

  void getOrCreateSettings().then((settings) => {
    const tz = resolveWorkDayTimezone(settings.complianceTimezone);
    logger.info(
      { runHour: ATTENDANCE_MATERIALIZE_RUN_HOUR, timezone: tz },
      "Attendance materialization job scheduled (nightly, prior work day)",
    );
  });

  setInterval(() => {
    void tick();
  }, JOB_TICK_MS);

  return tick;
}
