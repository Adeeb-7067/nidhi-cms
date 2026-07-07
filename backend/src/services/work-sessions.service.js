import { workSessionsTable, getNextSequence } from "../models/schema/index.js";
import { getOrCreateSettings } from "./company-settings.js";
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

/** Sessions paused for these reasons can resume on the next clock-in (same work day only). */
const RESUMABLE_STOP_REASONS = [
  "clock_out",
  "shift_ended",
  "day_ended",
  "app_quit",
  "logout",
  "system_sleep",
  "system_shutdown",
  "network_lost",
  "client_disconnected",
];

/** Client-initiated clock-out — never push from the API (user already knows). */
const USER_INITIATED_STOP_REASONS = new Set(["clock_out", "app_quit", "logout"]);

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

async function enforceShiftEndPolicy(session, tz, settings) {
  const shiftEnd = await evaluateShiftEndPolicy(session, new Date(), tz, settings);
  if (!shiftEnd) return session;

  await closeActiveSession(session, shiftEnd.reason, shiftEnd.endedAt);
  return null;
}

/** Auto-close when session crosses a work-day boundary, the 24 h cap, or shift end. */
async function enforceActiveSessionPolicy(session) {
  if (!session?.isActive) return session ?? null;

  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const reason = sessionPolicyStopReason(session, new Date(), tz);
  if (reason) {
    await closeActiveSession(session, reason);
    return null;
  }

  return enforceShiftEndPolicy(session, tz, settings);
}

async function closeActiveSessions(userId, { endedAt = new Date(), stopReason = null } = {}) {
  const update = { isActive: false, endedAt };
  if (stopReason) update.stopReason = stopReason;

  await workSessionsTable.updateMany({ userId, isActive: true }, { $set: update });
}

async function listResumableSessions(userId) {
  const tz = await resolveTimezone();
  const now = new Date();
  const matching = [];

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
    if (!isSessionWithinMaxDuration(session, now)) continue;
    matching.push(session);
  }

  const orphans = await workSessionsTable
    .find({
      userId,
      isActive: false,
      endedAt: { $ne: null },
      stopReason: null,
    })
    .sort({ endedAt: -1 })
    .limit(5)
    .lean();

  for (const session of orphans) {
    if (!isPausedSessionResumableToday(session, now, tz)) continue;
    if (!isSessionWithinMaxDuration(session, now)) continue;
    if (computeSessionDurations(session).activeDurationMs < 30 * 60 * 1000) continue;
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
  const existingActive = await workSessionsTable.findOne({ userId, isActive: true }).lean();
  if (existingActive) {
    const reclaimed = !forceNew ? await tryReclaimStrayActiveSession(userId) : null;
    if (reclaimed && reclaimed.id !== existingActive.id) {
      return { session: reclaimed, resumed: true };
    }

    const enforced = await enforceActiveSessionPolicy(existingActive);
    if (enforced) {
      // Another client (web + desktop) may clock in while a session is already active.
      const now = new Date();
      const refreshed = await workSessionsTable.findOneAndUpdate(
        { userId, isActive: true },
        { $set: { lastHeartbeatAt: now } },
        { new: true },
      );
      return { session: refreshed ?? enforced, resumed: false };
    }
  }

  if (!forceNew) {
    const resumableSessions = await listResumableSessions(userId);
    for (const resumable of resumableSessions) {
      const session = await resumeSession(resumable, deviceInfo);
      if (session) return { session, resumed: true };
    }

    // Concurrent clock-in: another request may have resumed while we were trying.
    const racedActive = await workSessionsTable.findOne({ userId, isActive: true }).lean();
    if (racedActive) {
      const enforced = await enforceActiveSessionPolicy(racedActive);
      if (enforced) {
        const refreshed = await workSessionsTable.findOneAndUpdate(
          { userId, isActive: true },
          { $set: { lastHeartbeatAt: new Date() } },
          { new: true },
        );
        return { session: refreshed ?? enforced, resumed: false };
      }
    }
  }

  await closeActiveSessions(userId, { stopReason: "clock_out" });

  const id = await getNextSequence("workSession");
  const now = new Date();
  const session = await workSessionsTable.create({
    id,
    userId,
    startedAt: now,
    endedAt: null,
    isActive: true,
    deviceInfo: deviceInfo ?? null,
    lastHeartbeatAt: now,
    pausePeriods: [],
  });

  return { session, resumed: false };
}

export async function touchHeartbeat(userId) {
  const active = await workSessionsTable.findOne({ userId, isActive: true }).lean();
  if (!active) return { session: null, stopReason: null };

  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const reason = sessionPolicyStopReason(active, new Date(), tz);
  if (reason) {
    await closeActiveSession(active, reason);
    return { session: null, stopReason: reason };
  }

  const shiftEnd = await evaluateShiftEndPolicy(active, new Date(), tz, settings);
  if (shiftEnd) {
    await closeActiveSession(active, shiftEnd.reason, shiftEnd.endedAt);
    return { session: null, stopReason: shiftEnd.reason };
  }

  const now = new Date();
  const session = await workSessionsTable.findOneAndUpdate(
    { userId, isActive: true },
    { $set: { lastHeartbeatAt: now } },
    { new: true },
  );
  return { session: session ?? null, stopReason: null };
}

export async function clockOut(userId, stopReason = "clock_out") {
  const session = await workSessionsTable.findOneAndUpdate(
    { userId, isActive: true },
    { $set: { isActive: false, endedAt: new Date(), stopReason } },
    { new: true },
  );
  if (
    session &&
    !USER_INITIATED_STOP_REASONS.has(stopReason) &&
    shouldNotifySessionEnd(stopReason)
  ) {
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
  if (!session) return { session: null, stopReason: null };

  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const reason = sessionPolicyStopReason(session, new Date(), tz);
  if (reason) {
    await closeActiveSession(session, reason);
    return { session: null, stopReason: reason };
  }

  const shiftEnd = await evaluateShiftEndPolicy(session, new Date(), tz, settings);
  if (shiftEnd) {
    await closeActiveSession(session, shiftEnd.reason, shiftEnd.endedAt);
    return { session: null, stopReason: shiftEnd.reason };
  }

  // App is open and polling — refresh heartbeat so stale cleanup does not fire falsely.
  const now = new Date();
  const refreshed = await workSessionsTable.findOneAndUpdate(
    { userId, isActive: true },
    { $set: { lastHeartbeatAt: now } },
    { new: true },
  );
  return { session: refreshed ?? session, stopReason: null };
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

/** Close active sessions with no recent heartbeat (crashed/killed clients). */
export async function closeStaleHeartbeatSessions(cutoff) {
  const now = new Date();
  const stale = await workSessionsTable
    .find({
      isActive: true,
      $or: [
        { lastHeartbeatAt: { $lt: cutoff } },
        { lastHeartbeatAt: null, startedAt: { $lt: cutoff } },
      ],
    })
    .select({ id: 1, userId: 1, startedAt: 1, isActive: 1, pausePeriods: 1 })
    .lean();

  let closed = 0;
  for (const session of stale) {
    const updated = await closeActiveSession(session, "client_disconnected", now);
    if (updated) closed++;
  }

  return { closed };
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
