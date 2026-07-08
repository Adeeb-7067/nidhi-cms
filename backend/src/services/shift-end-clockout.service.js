import { workSessionsTable } from "../models/schema/index.js";
import { getOrCreateSettings } from "./company-settings.js";
import {
  resolveWorkDayTimezone,
  workDayKey,
  isSameWorkDay,
  addDaysToDateString,
  resolveActiveSegmentStart,
} from "./work-session-policy.js";
import { zonedDateTimeToUtc } from "./hrm/hrm-date-utils.js";
import {
  buildShiftMapForRange,
  resolveEffectiveShiftForUser,
  resolveDefaultShiftTemplateId,
} from "./hrm/shifts.service.js";
import { notifyShiftAutoClockOut } from "./work-session-notifications.js";
import { broadcastWorkSessionSync } from "./work-session-sync.js";

async function closeSessionAtShiftEnd(session, endedAt) {
  const updated = await workSessionsTable.findOneAndUpdate(
    { id: session.id, userId: session.userId, isActive: true },
    { $set: { isActive: false, endedAt, stopReason: "shift_ended" } },
    { new: true },
  );
  if (updated) {
    await notifyShiftAutoClockOut({
      userId: updated.userId,
      sessionId: updated.id,
    });
    broadcastWorkSessionSync(updated.userId, { action: "shift_auto_clock_out", session: null });
  }
  return updated ?? null;
}

/** UTC instant when a shift ends on a calendar day (handles overnight shifts). */
export function computeShiftEndUtc(dateStr, shift, tz) {
  if (!shift?.endTime || !shift?.startTime) return null;
  const startUtc = zonedDateTimeToUtc(dateStr, shift.startTime, tz);
  let endUtc = zonedDateTimeToUtc(dateStr, shift.endTime, tz);
  if (!endUtc) return null;
  if (startUtc && endUtc <= startUtc) {
    endUtc = zonedDateTimeToUtc(addDaysToDateString(dateStr, 1), shift.endTime, tz);
  }
  return endUtc;
}

/**
 * True when an active session started during the shift and the shift end time has passed.
 * Uses segmentStartedAt (current segment) — overtime after shift end stays open until manual clock-out.
 */
export function shouldAutoClockOutAtShiftEnd(session, now, shift, tz) {
  if (!session?.startedAt || !shift?.endTime) return false;
  const dateStr = workDayKey(session.startedAt, tz);
  const shiftEnd = computeShiftEndUtc(dateStr, shift, tz);
  if (!shiftEnd) return false;
  const segmentStart = resolveActiveSegmentStart(session, shiftEnd);
  const startedAt = segmentStart.getTime();
  if (startedAt >= shiftEnd.getTime()) return false;
  return now.getTime() > shiftEnd.getTime();
}

/** Returns { reason, endedAt } when shift end should close the session, else null. */
export async function evaluateShiftEndPolicy(session, now = new Date(), tz, settings = null) {
  if (!session?.isActive) return null;
  if (!isSameWorkDay(session.startedAt, now, tz)) return null;

  const dateStr = workDayKey(session.startedAt, tz);
  const shift = await resolveEffectiveShiftForUser(session.userId, dateStr, { settings });
  if (!shouldAutoClockOutAtShiftEnd(session, now, shift, tz)) return null;

  const endedAt = computeShiftEndUtc(dateStr, shift, tz) ?? now;
  return { reason: "shift_ended", endedAt };
}

/** Scheduled cleanup: close active sessions whose shift has ended (same work day). */
export async function closeSessionsPastShiftEnd() {
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const now = new Date();
  const todayKey = workDayKey(now, tz);

  const active = await workSessionsTable.find({ isActive: true }).lean();
  if (!active.length) return { closed: 0, workDay: todayKey };

  const userIds = [...new Set(active.map((s) => s.userId))];
  const defaultShiftId = await resolveDefaultShiftTemplateId(settings);
  const shiftMap = await buildShiftMapForRange(userIds, todayKey, todayKey, {
    defaultTemplateId: defaultShiftId,
  });

  let closed = 0;
  for (const session of active) {
    if (!isSameWorkDay(session.startedAt, now, tz)) continue;

    const dateStr = workDayKey(session.startedAt, tz);
    const shift = shiftMap.get(`${session.userId}:${dateStr}`);
    if (!shouldAutoClockOutAtShiftEnd(session, now, shift, tz)) continue;

    const endedAt = computeShiftEndUtc(dateStr, shift, tz) ?? now;
    const updated = await closeSessionAtShiftEnd(session, endedAt);
    if (updated) closed++;
  }

  return { closed, workDay: todayKey };
}
