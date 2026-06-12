import { clockIn, clockOut, getActiveSession, listSessions, listActiveSessions, terminateSession } from "../services/work-sessions.service.js";
import { badRequest, parseIdParam } from "../utils/route-errors.js";
import { notifyUser } from "../lib/realtime.js";

// Only these values are accepted from external callers — prevents injection of internal codes.
const ALLOWED_STOP_REASONS = ["clock_out", "app_quit", "logout"];

function formatSession(session) {
  if (!session) return null;
  return {
    id: session.id,
    userId: session.userId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    isActive: session.isActive,
    deviceInfo: session.deviceInfo ?? null,
    stopReason: session.stopReason ?? null,
    durationMs: session.endedAt
      ? new Date(session.endedAt) - new Date(session.startedAt)
      : Date.now() - new Date(session.startedAt),
  };
}

export async function handleClockIn(req, res) {
  const session = await clockIn(req.user.id, req.body.deviceInfo ?? req.headers["user-agent"]);
  res.status(201).json({ session: formatSession(session) });
}

export async function handleClockOut(req, res) {
  const reason = req.body.stopReason ?? "clock_out";
  if (!ALLOWED_STOP_REASONS.includes(reason)) {
    badRequest(`stopReason must be one of: ${ALLOWED_STOP_REASONS.join(", ")}`, "stopReason");
  }
  const session = await clockOut(req.user.id, reason);
  if (!session) {
    return res.status(200).json({ session: null, message: "No active session found" });
  }
  res.json({ session: formatSession(session) });
}

export async function handleGetActive(req, res) {
  const isAdmin = req.user.role === "super_admin";
  // Admin can query any user's active session via ?userId=X
  const userId = isAdmin && req.query.userId
    ? parseIdParam(req.query.userId, "userId")
    : req.user.id;
  const session = await getActiveSession(userId);
  res.json({ session: formatSession(session) });
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
  // Notify the affected user in real-time so their Electron client stops immediately
  notifyUser(session.userId, "session_terminated", {
    sessionId: session.id,
    reason: "admin_terminated",
    terminatedBy: req.user.id,
    terminatedAt: new Date().toISOString(),
  });
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
