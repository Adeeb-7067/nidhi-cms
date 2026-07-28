import { workSessionsTable, getNextSequence } from "../../../models/schema/index.js";
import { getOrCreateSettings } from "../../settings/services/company-settings.js";
import { notifyWorkSessionEnded, notifyShiftAutoClockOut, shouldNotifySessionEnd } from "./work-session-notifications.js";
import {
  isSameWorkDay,
  isSessionWithinMaxDuration,
  resolveWorkDayTimezone,
  sessionPolicyStopReason,
  workDayKey,
  defaultDailyRangeEnd,
  defaultDailyRangeStart,
  isPausedSessionResumableToday,
} from "./work-session-policy.js";
import { evaluateShiftEndPolicy } from "./shift-end-clockout.service.js";
import { broadcastWorkSessionSync } from "./work-session-sync.js";

/**
 * Auto pause (not permanent end) — only these may stop a session without a manual clock-out click.
 * day_ended is a work-day boundary (yesterday's session closes; today starts a new one).
 */
export const AUTO_PAUSE_STOP_REASONS = [
  "shift_ended",
  "system_sleep",
  "system_shutdown",
  "app_quit",
];

/** Same-day clock-in always resumes today's session for these (and any other same-day pause). */
const RESUMABLE_STOP_REASONS = [
  "clock_out",
  "shift_ended",
  "app_quit",
  "logout",
  "system_sleep",
  "system_shutdown",
  // Legacy rows — still resume same day, but new auto-closes no longer emit these.
  "network_lost",
  "client_disconnected",
];

/**
 * Manual / intentional stops — skip push notification (user already knows).
 * app_quit / sleep / shutdown DO notify so employees see why they were paused.
 */
const SILENT_USER_STOP_REASONS = new Set(["clock_out", "logout"]);

/** Surface auto-close reason on poll/heartbeat shortly after background cleanup (web has no socket). */
const RECENT_STOP_SURFACING_MS = 15 * 60 * 1000;
const SURFACED_AUTO_STOP_REASONS = [
  "shift_ended",
  "day_ended",
  "system_sleep",
  "system_shutdown",
  "app_quit",
];

function sumPauseDurationMs(pausePeriods = []) {
  return pausePeriods.reduce((sum, period) => {
    if (!period?.pausedAt || !period?.resumedAt) return sum;
    const paused = new Date(period.pausedAt).getTime();
    const resumed = new Date(period.resumedAt).getTime();
    if (!Number.isFinite(paused) || !Number.isFinite(resumed) || resumed <= paused) return sum;
    return sum + (resumed - paused);
  }, 0);
}

export function computeSessionDurations(session) {
  if (!session) {
    return { totalDurationMs: 0, activeDurationMs: 0, pauseDurationMs: 0 };
  }

  const started = new Date(session.startedAt).getTime();
  const endMs = session.isActive
    ? Date.now()
    : session.endedAt
      ? new Date(session.endedAt).getTime()
      : Date.now();
  const totalDurationMs = Math.max(0, endMs - started);
  const pauseDurationMs = sumPauseDurationMs(session.pausePeriods);
  const activeDurationMs = Math.max(0, totalDurationMs - pauseDurationMs);

  return { totalDurationMs, activeDurationMs, pauseDurationMs };
}

async function resolveTimezone() {
  const settings = await getOrCreateSettings();
  return resolveWorkDayTimezone(settings.complianceTimezone);
}

async function closeActiveSession(session, stopReason, endedAt = new Date()) {
  const updated = await workSessionsTable.findOneAndUpdate(
    { id: session.id, userId: session.userId, isActive: true },
    { $set: { isActive: false, endedAt, stopReason } },
    { new: true },
  );
  if (updated) {
    if (stopReason === "shift_ended") {
      await notifyShiftAutoClockOut({ userId: updated.userId, sessionId: updated.id });
      broadcastWorkSessionSync(updated.userId, { action: "shift_auto_clock_out", session: null });
    } else {
      await notifyWorkSessionEnded({
        userId: updated.userId,
        sessionId: updated.id,
        stopReason,
      });
    }
  }
  return updated ?? null;
}

/**
 * Single gate for day-end, max-duration, and shift-end policies.
 * Every code path that returns or keeps an active session must go through this.
 */
async function synchronizeActiveSession(session, { updateHeartbeat = true } = {}) {
  if (!session?.isActive) return { session: null, stopReason: null };

  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const now = new Date();

  const reason = sessionPolicyStopReason(session, now, tz);
  if (reason) {
    await closeActiveSession(session, reason);
    return { session: null, stopReason: reason };
  }

  const shiftEnd = await evaluateShiftEndPolicy(session, now, tz, settings);
  if (shiftEnd) {
    await closeActiveSession(session, shiftEnd.reason, shiftEnd.endedAt);
    return { session: null, stopReason: shiftEnd.reason };
  }

  if (!updateHeartbeat) return { session, stopReason: null };

  const refreshed = await workSessionsTable.findOneAndUpdate(
    { id: session.id, userId: session.userId, isActive: true },
    { $set: { lastHeartbeatAt: now } },
    { new: true },
  );
  return { session: refreshed ?? session, stopReason: null };
}

async function deliverClockInSession(session) {
  const { session: active, stopReason } = await synchronizeActiveSession(session);
  return { session: active, stopReason };
}

/** When cleanup already closed the session, clients still need the stop reason for toasts. */
async function resolveRecentSessionStopReason(userId) {
  const cutoff = new Date(Date.now() - RECENT_STOP_SURFACING_MS);
  const recent = await workSessionsTable
    .findOne({
      userId,
      isActive: false,
      endedAt: { $gte: cutoff },
      stopReason: { $in: SURFACED_AUTO_STOP_REASONS },
    })
    .sort({ endedAt: -1 })
    .lean();

  return recent?.stopReason ?? null;
}

async function closeActiveSessions(userId, { endedAt = new Date(), stopReason = null } = {}) {
  const update = { isActive: false, endedAt };
  if (stopReason) update.stopReason = stopReason;

  await workSessionsTable.updateMany({ userId, isActive: true }, { $set: update });
}

/**
 * One work day → one session. Find today's session (active or paused) to resume.
 * Yesterday's sessions are never resumed (next day → new session).
 */
async function findSameDaySession(userId) {
  const tz = await resolveTimezone();
  const now = new Date();
  const todayKey = workDayKey(now, tz);

  const candidates = await workSessionsTable
    .find({ userId })
    .sort({ startedAt: -1 })
    .limit(30)
    .lean();

  for (const session of candidates) {
    if (!session?.startedAt) continue;
    if (workDayKey(session.startedAt, tz) !== todayKey) continue;
    return session;
  }
  return null;
}

async function listResumableSessions(userId) {
  const tz = await resolveTimezone();
  const now = new Date();
  const matching = [];

  // Prefer the single same-day session regardless of stopReason (one day → one session).
  const sameDay = await findSameDaySession(userId);
  if (sameDay && !sameDay.isActive && sameDay.endedAt) {
    if (isPausedSessionResumableToday(sameDay, now, tz)) {
      matching.push(sameDay);
      return matching;
    }
  }

  const candidates = await workSessionsTable
    .find({
      userId,
      isActive: false,
      stopReason: { $in: RESUMABLE_STOP_REASONS },
    })
    .sort({ endedAt: -1 })
    .limit(10)
    .lean();

  for (const session of candidates) {
    if (!session.endedAt) continue;
    if (!isPausedSessionResumableToday(session, now, tz)) continue;
    matching.push(session);
  }

  return matching;
}

async function findResumableSession(userId) {
  const sessions = await listResumableSessions(userId);
  return sessions[0] ?? null;
}

async function resumeSession(session, deviceInfo) {
  const now = new Date();
  const pausePeriods = [...(session.pausePeriods ?? [])];

  if (session.endedAt) {
    pausePeriods.push({
      pausedAt: session.endedAt,
      resumedAt: now,
      stopReason: session.stopReason ?? null,
    });
  }

  const resumed = await workSessionsTable.findOneAndUpdate(
    { id: session.id, userId: session.userId, isActive: false },
    {
      $set: {
        isActive: true,
        endedAt: null,
        stopReason: null,
        segmentStartedAt: now,
        lastHeartbeatAt: now,
        deviceInfo: deviceInfo ?? session.deviceInfo ?? null,
        pausePeriods,
      },
    },
    { new: true },
  );

  return resumed;
}

/**
 * When shift auto clock-out failed to resume, a short stray session may be active.
 * Reattach to the original same-day session so prior hours are not lost.
 */
async function tryReclaimStrayActiveSession(userId) {
  const active = await workSessionsTable.findOne({ userId, isActive: true }).lean();
  if (!active) return null;

  const primary = await findResumableSession(userId);
  if (!primary) return active;

  const activeStarted = new Date(active.startedAt).getTime();
  const primaryStarted = new Date(primary.startedAt).getTime();
  if (!Number.isFinite(activeStarted) || !Number.isFinite(primaryStarted)) return active;
  if (primaryStarted >= activeStarted) return active;

  const primaryMs = computeSessionDurations(primary).activeDurationMs;
  const activeMs = computeSessionDurations(active).activeDurationMs;
  const shouldReclaim =
    primary.stopReason === "shift_ended" ||
    primaryMs > activeMs + 5 * 60 * 1000;
  if (!shouldReclaim) return active;

  const now = new Date();
  await closeActiveSession(active, "clock_out", now);
  const resumed = await resumeSession(primary, active.deviceInfo);
  return resumed ?? active;
}

export async function clockIn(userId, deviceInfo, { forceNew = false } = {}) {
  // Policy: one work day → one session. forceNew cannot create a second same-day session.
  const existingActive = await workSessionsTable.findOne({ userId, isActive: true }).lean();
  if (existingActive) {
    const reclaimed = await tryReclaimStrayActiveSession(userId);
    if (reclaimed && reclaimed.id !== existingActive.id) {
      const delivered = await deliverClockInSession(reclaimed);
      if (delivered.session) return { session: delivered.session, resumed: true };
    } else {
      const delivered = await deliverClockInSession(existingActive);
      if (delivered.session) return { session: delivered.session, resumed: false };
    }
  }

  const sameDay = await findSameDaySession(userId);
  if (sameDay && !sameDay.isActive) {
    const session = await resumeSession(sameDay, deviceInfo);
    if (session) {
      const delivered = await deliverClockInSession(session);
      if (delivered.session) return { session: delivered.session, resumed: true };
      // Only create a brand-new session when the work day itself rolled over.
      if (delivered.stopReason !== "day_ended") {
        throw new Error(
          "Could not resume today's work session. Please try clock-in again.",
        );
      }
    }
  } else if (!sameDay) {
    const resumableSessions = await listResumableSessions(userId);
    for (const resumable of resumableSessions) {
      const session = await resumeSession(resumable, deviceInfo);
      if (!session) continue;
      const delivered = await deliverClockInSession(session);
      if (delivered.session) return { session: delivered.session, resumed: true };
      if (delivered.stopReason === "day_ended") break;
    }
  }

  const racedActive = await workSessionsTable.findOne({ userId, isActive: true }).lean();
  if (racedActive) {
    const delivered = await deliverClockInSession(racedActive);
    if (delivered.session) return { session: delivered.session, resumed: false };
  }

  // New session only when no same-day session exists (first clock-in of the work day).
  await closeActiveSessions(userId, { stopReason: "clock_out" });

  const id = await getNextSequence("workSession");
  const now = new Date();
  const created = await workSessionsTable.create({
    id,
    userId,
    startedAt: now,
    segmentStartedAt: now,
    endedAt: null,
    isActive: true,
    deviceInfo: deviceInfo ?? null,
    lastHeartbeatAt: now,
    pausePeriods: [],
  });
  const session = created.toObject ? created.toObject() : created;
  const delivered = await deliverClockInSession(session);
  if (delivered.session) return { session: delivered.session, resumed: false };

  throw new Error("Clock-in could not start an active session after policy sync.");
}

export async function touchHeartbeat(userId) {
  const active = await workSessionsTable.findOne({ userId, isActive: true }).lean();
  if (!active) {
    const stopReason = await resolveRecentSessionStopReason(userId);
    return { session: null, stopReason };
  }
  return synchronizeActiveSession(active);
}

export async function clockOut(userId, stopReason = "clock_out") {
  const session = await workSessionsTable.findOneAndUpdate(
    { userId, isActive: true },
    { $set: { isActive: false, endedAt: new Date(), stopReason } },
    { new: true },
  );
  if (session && !SILENT_USER_STOP_REASONS.has(stopReason) && shouldNotifySessionEnd(stopReason)) {
    await notifyWorkSessionEnded({
      userId: session.userId,
      sessionId: session.id,
      stopReason,
    });
  }
  return session ?? null;
}

export async function forceClockOutAll(stopReason = "session_expired") {
  const result = await workSessionsTable.updateMany(
    { isActive: true },
    { $set: { isActive: false, endedAt: new Date(), stopReason } },
  );
  return result.modifiedCount;
}

export async function getActiveSession(userId) {
  let session = await workSessionsTable.findOne({ userId, isActive: true }).lean();
  if (session) {
    session = (await tryReclaimStrayActiveSession(userId)) ?? session;
  }
  if (!session) {
    const stopReason = await resolveRecentSessionStopReason(userId);
    return { session: null, stopReason };
  }
  return synchronizeActiveSession(session);
}

export async function listSessions(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const filter = userId != null ? { userId } : {};
  const [items, total] = await Promise.all([
    workSessionsTable.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
    workSessionsTable.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function listActiveSessions() {
  return workSessionsTable.find({ isActive: true }).sort({ startedAt: -1 }).lean();
}

export async function terminateSession(sessionId) {
  const session = await workSessionsTable.findOneAndUpdate(
    { id: sessionId, isActive: true },
    { $set: { isActive: false, endedAt: new Date(), stopReason: "admin_terminated" } },
    { new: true },
  );
  if (session) {
    await notifyWorkSessionEnded({
      userId: session.userId,
      sessionId: session.id,
      stopReason: "admin_terminated",
    });
  }
  return session ?? null;
}

/** Close active sessions that started on a previous work day (runs on a schedule). */
export async function closeSessionsPastWorkDay() {
  const tz = await resolveTimezone();
  const now = new Date();
  const todayKey = workDayKey(now, tz);
  const active = await workSessionsTable.find({ isActive: true }).lean();
  let closed = 0;

  for (const session of active) {
    if (isSameWorkDay(session.startedAt, now, tz)) continue;
    const updated = await closeActiveSession(session, "day_ended", now);
    if (updated) closed++;
  }

  return { closed, todayKey };
}

/** Close active sessions that exceed the 24-hour wall-clock cap. */
export async function closeSessionsExceedingMaxDuration() {
  const now = new Date();
  const active = await workSessionsTable.find({ isActive: true }).lean();
  let closed = 0;

  for (const session of active) {
    if (isSessionWithinMaxDuration(session, now)) continue;
    const updated = await closeActiveSession(session, "session_expired", now);
    if (updated) closed++;
  }

  return { closed };
}

/**
 * Stale-heartbeat auto-close is DISABLED.
 * Policy: only shift end, sleep, and app/window shutdown may auto-pause a session.
 * Missed heartbeats must not silently erase work time.
 */
export async function closeStaleHeartbeatSessions(_cutoff) {
  return { closed: 0, disabled: true };
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateKey(dateStr, label) {
  const value = dateStr?.trim();
  if (!value || !DATE_KEY_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected YYYY-MM-DD`);
  }
  return value;
}

function queryWindowForDateRange(from, to) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return {
    start: new Date(Date.UTC(fy, fm - 1, fd - 1, 0, 0, 0)),
    end: new Date(Date.UTC(ty, tm - 1, td + 1, 23, 59, 59, 999)),
  };
}

export { queryWindowForDateRange };

/**
 * Sum active work time per employee per work day (company timezone).
 * Sessions are attributed to the calendar day they started on.
 */
export async function listDailySessionTotals({
  userId = null,
  userIds = null,
  fromDate,
  toDate,
  page = 1,
  limit = 50,
  allRows = false,
} = {}) {
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const to = toDate?.trim() ? parseDateKey(toDate, "toDate") : defaultDailyRangeEnd(tz);
  const from = fromDate?.trim() ? parseDateKey(fromDate, "fromDate") : defaultDailyRangeStart(tz, 6);

  if (from > to) {
    return { data: [], total: 0, page, limit, from, to, timezone: tz };
  }

  const { start, end } = queryWindowForDateRange(from, to);
  const filter = { startedAt: { $gte: start, $lte: end } };
  if (userId != null) filter.userId = userId;
  else if (userIds?.length) filter.userId = { $in: userIds };

  const sessions = await workSessionsTable.find(filter).lean();
  const buckets = new Map();

  for (const session of sessions) {
    const dayKey = workDayKey(session.startedAt, tz);
    if (dayKey < from || dayKey > to) continue;

    const { activeDurationMs } = computeSessionDurations(session);
    const key = `${session.userId}:${dayKey}`;
    const row = buckets.get(key) ?? {
      userId: session.userId,
      date: dayKey,
      totalMs: 0,
      sessionCount: 0,
      hasActiveSession: false,
    };
    row.totalMs += activeDurationMs;
    row.sessionCount += 1;
    if (session.isActive) row.hasActiveSession = true;
    buckets.set(key, row);
  }

  const rows = Array.from(buckets.values()).sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return a.userId - b.userId;
  });

  const total = rows.length;
  const skip = (page - 1) * limit;
  return {
    data: allRows ? rows : rows.slice(skip, skip + limit),
    total,
    page,
    limit,
    from,
    to,
    timezone: tz,
  };
}
