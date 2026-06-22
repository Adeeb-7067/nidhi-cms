import {
  clockIn,
  clockOut,
  computeSessionDurations,
  getActiveSession,
  listSessions,
  listActiveSessions,
  listDailySessionTotals,
  terminateSession,
  touchHeartbeat,
} from "../services/work-sessions.service.js";
import { broadcastWorkSessionSync } from "../services/work-session-sync.js";
import { badRequest, parseIdParam } from "../utils/route-errors.js";

// Only these values are accepted from external callers — prevents injection of internal codes.
const ALLOWED_STOP_REASONS = [
  "clock_out",
  "app_quit",
  "logout",
  "system_sleep",
  "system_shutdown",
  "network_lost",
];

function formatSession(session) {
  if (!session) return null;
  const { totalDurationMs, activeDurationMs, pauseDurationMs } = computeSessionDurations(session);
  return {
    id: session.id,
    userId: session.userId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    isActive: session.isActive,
    deviceInfo: session.deviceInfo ?? null,
    stopReason: session.stopReason ?? null,
    lastHeartbeatAt: session.lastHeartbeatAt ?? null,
    pausePeriods: session.pausePeriods ?? [],
    /** Active work time — excludes recorded pause periods between clock-out/in. */
    durationMs: activeDurationMs,
    totalDurationMs,
    pauseDurationMs,
  };
}

export async function handleClockIn(req, res) {
  const forceNew = req.body.forceNew === true;
  const { session, resumed } = await clockIn(
    req.user.id,
    req.body.deviceInfo ?? req.headers["user-agent"],
    { forceNew },
  );
  const formatted = formatSession(session);
  broadcastWorkSessionSync(req.user.id, {
    action: resumed ? "resume" : "clock_in",
    session: formatted,
  });
  res.status(201).json({ session: formatted, resumed });
}

export async function handleHeartbeat(req, res) {
  const { session, stopReason } = await touchHeartbeat(req.user.id);
  if (!session) {
    return res.status(200).json({
      session: null,
      stopReason: stopReason ?? undefined,
      message: "No active session found",
    });
  }
  res.json({ session: formatSession(session) });
}

export async function handleClockOut(req, res) {
  const reason = req.body.stopReason ?? "clock_out";
  if (!ALLOWED_STOP_REASONS.includes(reason)) {
    badRequest(`stopReason must be one of: ${ALLOWED_STOP_REASONS.join(", ")}`, "stopReason");
  }
  const session = await clockOut(req.user.id, reason);
  if (!session) {
    broadcastWorkSessionSync(req.user.id, { action: "clock_out", session: null });
    return res.status(200).json({ session: null, message: "No active session found" });
  }
  const formatted = formatSession(session);
  broadcastWorkSessionSync(req.user.id, { action: "clock_out", session: formatted });
  res.json({ session: formatted });
}

export async function handleGetActive(req, res) {
  const isAdmin = req.user.role === "super_admin";
  // Admin can query any user's active session via ?userId=X
  const userId = isAdmin && req.query.userId
    ? parseIdParam(req.query.userId, "userId")
    : req.user.id;
  const { session, stopReason } = await getActiveSession(userId);
  res.json({ session: formatSession(session), stopReason: stopReason ?? undefined });
}

export async function handleListActiveSessions(req, res) {
  // Super admin only — returns all currently active sessions across all employees
  const sessions = await listActiveSessions();
  res.json({ data: sessions.map(formatSession), total: sessions.length });
}

export async function handleForceTerminate(req, res) {
  const sessionId = parseIdParam(req.params.sessionId, "sessionId");
  const session = await terminateSession(sessionId);
  if (!session) {
    return res.status(200).json({ session: null, message: "Session not found or already ended" });
  }
  // Realtime + notification handled in terminateSession → notifyWorkSessionEnded
  res.json({ session: formatSession(session) });
}

export async function handleListSessions(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const isAdmin = req.user.role === "super_admin";

  let userId;
  if (isAdmin) {
    // Admin: optional ?userId filter; omitting it returns all employees' sessions
    userId = req.query.userId ? parseIdParam(req.query.userId, "userId") : null;
  } else {
    // Employee: always own sessions only
    userId = req.user.id;
  }

  const result = await listSessions(userId, { page, limit });
  res.json({
    data: result.items.map(formatSession),
    total: result.total,
    page: result.page,
    limit: result.limit,
  });
}

export async function handleListDailyTotals(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));
  const isAdmin = req.user.role === "super_admin";

  let userId;
  if (isAdmin) {
    userId = req.query.userId ? parseIdParam(req.query.userId, "userId") : null;
  } else {
    userId = req.user.id;
  }

  try {
    const result = await listDailySessionTotals({
      userId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    badRequest(err.message ?? "Invalid date range", "dateRange");
  }
}
