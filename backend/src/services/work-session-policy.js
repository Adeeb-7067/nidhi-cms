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
  if (session.stopReason === "shift_ended" && session.endedAt) {
    return workDayKey(session.endedAt, tz) === todayKey;
  }
  return false;
}
