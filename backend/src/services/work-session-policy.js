/** Max wall-clock span for one work session (ms). */
export const MAX_SESSION_MS = 24 * 60 * 60 * 1000;

export function resolveWorkDayTimezone(settingsTz) {
  return settingsTz?.trim() || process.env.COMPLIANCE_TIMEZONE?.trim() || "UTC";
}

/** YYYY-MM-DD in the given IANA timezone. */
export function workDayKey(date, tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}

export function isSameWorkDay(a, b, tz) {
  return workDayKey(a, tz) === workDayKey(b, tz);
}

export function isSessionWithinMaxDuration(session, now = new Date()) {
  const started = new Date(session.startedAt).getTime();
  if (!Number.isFinite(started)) return false;
  return now.getTime() - started < MAX_SESSION_MS;
}

/** Returns stopReason when an active session must end, else null. */
export function sessionPolicyStopReason(session, now = new Date(), tz) {
  if (!session?.isActive) return null;
  if (!isSameWorkDay(session.startedAt, now, tz)) return "day_ended";
  if (!isSessionWithinMaxDuration(session, now)) return "session_expired";
  return null;
}

/** YYYY-MM-DD plus/minus calendar days (UTC date math). */
export function addDaysToDateString(dateStr, deltaDays) {
  const [y, m, d] = String(dateStr).split("-").map((n) => Number.parseInt(n, 10));
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return utc.toISOString().slice(0, 10);
}

export function defaultDailyRangeEnd(tz) {
  return workDayKey(new Date(), tz);
}

export function defaultDailyRangeStart(tz, days = 6) {
  return addDaysToDateString(defaultDailyRangeEnd(tz), -days);
}

/**
 * True when a paused session can resume on clock-in today.
 * Covers same-day sessions and overnight shifts auto-clocked out after midnight.
 */
export function isPausedSessionResumableToday(session, now = new Date(), tz) {
  if (!session?.startedAt) return false;
  const todayKey = workDayKey(now, tz);
  const startDay = workDayKey(session.startedAt, tz);
  if (startDay === todayKey) return true;
  // Overnight shift or midnight auto-close: session started yesterday but ended today.
  if (session.endedAt && workDayKey(session.endedAt, tz) === todayKey) {
    return true;
  }
  return false;
}

/**
 * Legacy fallback: infer overtime segment start from pause periods when segmentStartedAt
 * is missing on older sessions.
 */
export function resolveShiftPolicySegmentStartFromPauses(session, shiftEndUtc) {
  const originalStart = new Date(session.startedAt);
  if (!shiftEndUtc || !Number.isFinite(originalStart.getTime())) return originalStart;

  const shiftEndMs = shiftEndUtc.getTime();
  const periods = session.pausePeriods ?? [];
  let latestOvertimeResume = null;

  for (const period of periods) {
    if (!period?.resumedAt) continue;
    const resumedAt = new Date(period.resumedAt);
    if (!Number.isFinite(resumedAt.getTime())) continue;
    if (resumedAt.getTime() >= shiftEndMs) {
      if (!latestOvertimeResume || resumedAt > latestOvertimeResume) {
        latestOvertimeResume = resumedAt;
      }
    }
  }

  return latestOvertimeResume ?? originalStart;
}

/**
 * When evaluating shift-end auto clock-out, use the current segment start.
 * Prefers explicit segmentStartedAt; falls back to pause-period inference for legacy rows.
 */
export function resolveActiveSegmentStart(session, shiftEndUtc) {
  if (session?.segmentStartedAt) {
    const segment = new Date(session.segmentStartedAt);
    if (Number.isFinite(segment.getTime())) return segment;
  }
  return resolveShiftPolicySegmentStartFromPauses(session, shiftEndUtc);
}
