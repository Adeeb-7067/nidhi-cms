import type { WorkSession } from "@/api/work-sessions";
import { formatDuration, intervalToDuration } from "date-fns";

/** Human-readable active session duration (e.g. "4 hours 32 minutes"). */
export function formatActiveDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const dur = intervalToDuration({ start: 0, end: ms });
  return formatDuration(dur, { format: ["hours", "minutes"] }) || "< 1 min";
}

/** Active work elapsed — excludes completed pause periods within the shift. */
export function getActiveSessionElapsedMs(session: WorkSession, nowMs = Date.now()): number {
  const started = new Date(session.startedAt).getTime();
  if (!Number.isFinite(started)) return 0;

  const pauseMs = (session.pausePeriods ?? []).reduce((sum, period) => {
    if (!period.pausedAt || !period.resumedAt) return sum;
    const paused = new Date(period.pausedAt).getTime();
    const resumed = new Date(period.resumedAt).getTime();
    if (!Number.isFinite(paused) || !Number.isFinite(resumed) || resumed <= paused) return sum;
    return sum + (resumed - paused);
  }, 0);

  return Math.max(0, nowMs - started - pauseMs);
}

/**
 * Live active duration for the clock-in button — aligned with backend `durationMs`
 * (active time, pauses excluded). Uses server snapshot + time since last heartbeat.
 */
export function getLiveActiveDurationMs(session: WorkSession, nowMs = Date.now()): number {
  if (!session.isActive) {
    return session.durationMs ?? getActiveSessionElapsedMs(session, nowMs);
  }

  const serverActiveMs = session.durationMs;
  const anchorMs = new Date(session.lastHeartbeatAt ?? session.startedAt).getTime();

  if (serverActiveMs != null && Number.isFinite(anchorMs)) {
    return Math.max(0, serverActiveMs + (nowMs - anchorMs));
  }

  return getActiveSessionElapsedMs(session, nowMs);
}

/** Daily active total with live tick for the in-progress session segment. */
export function getLiveDailyActiveMs(
  dailyTotalMs: number,
  activeSession: WorkSession | null | undefined,
): number {
  if (!activeSession?.isActive) return dailyTotalMs;
  const snapshot = activeSession.durationMs ?? 0;
  const liveSession = getLiveActiveDurationMs(activeSession);
  return Math.max(0, dailyTotalMs - snapshot + liveSession);
}

const ALERT_STORAGE_PREFIX = "cms:work-session-alert:";

/** Persist across app restarts — avoids re-toasting the same session-end alert on every open. */
export function wasWorkSessionAlertShown(key: string): boolean {
  try {
    return localStorage.getItem(`${ALERT_STORAGE_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

export function markWorkSessionAlertShown(key: string): void {
  try {
    localStorage.setItem(`${ALERT_STORAGE_PREFIX}${key}`, "1");
  } catch {
    /* private mode / quota */
  }
}

export function workSessionAlertKey(sessionId: number | string, stopReason: string): string {
  return `${sessionId}:${stopReason}`;
}
