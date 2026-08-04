import { notificationsTable, getNextSequence } from "../../../models/schema/index.js";
import { notifyUser, emitToUsers } from "../../../lib/realtime.js";
import { sendWebPushToUser } from "../../collab/services/push-notifications.js";
import { logger } from "../../../lib/logger.js";

/**
 * User-facing copy when a session is auto-paused / closed.
 * Always explain *why* — employees must know unpaid gaps are not silent.
 */
const SESSION_END_COPY = {
  system_sleep: {
    title: "Session paused — PC sleep",
    body: "You were clocked out because your PC went to sleep. Clock in again to continue today's session (sleep time is not counted).",
  },
  system_shutdown: {
    title: "Session paused — PC shutdown",
    body: "You were clocked out because your PC is shutting down. Clock in again after restart to continue today's session.",
  },
  app_quit: {
    title: "Session paused — app closed",
    body: "You were clocked out because the desktop app window was closed. Clock in again today to continue the same session.",
  },
  logout: {
    title: "Session paused — logged out",
    body: "Your work session was paused when you logged out. Clock in again today to continue the same session.",
  },
  shift_ended: {
    title: "Automatically clocked out — shift ended",
    body: "Your scheduled shift ended, so you were clocked out. Clock in again if you are still working (overtime), or that time will not be counted. Same day = same session.",
  },
  day_ended: {
    title: "Previous work day ended",
    body: "A new work day started — yesterday's session was closed. Clock in to start today's new session.",
  },
  session_expired: {
    title: "Session closed — 24-hour limit",
    body: "Your session hit the 24-hour safety limit and was closed. Clock in to start a new session.",
  },
  admin_terminated: {
    title: "Session ended by admin",
    body: "An administrator ended your work session. Clock in again when you are ready to work.",
  },
  leave_approved: {
    title: "Clocked out — leave approved",
    body: "Your full-day leave was approved and your active work session was ended.",
  },
  network_lost: {
    title: "Session paused — network lost",
    body: "Your session was paused after prolonged network loss. Clock in again today to continue the same session.",
  },
  client_disconnected: {
    title: "Session paused — connection lost",
    body: "Your session was paused because the app stopped sending heartbeats. Clock in again today to continue the same session.",
  },
  overtime_idle: {
    title: "Overtime session paused — inactive",
    body: "Your overtime session was paused because no activity was detected (CMS closed, idle, or offline). Clock in again today to resume — idle time is not counted.",
  },
};

export function shouldNotifySessionEnd(stopReason) {
  return Boolean(stopReason && stopReason !== "clock_out" && SESSION_END_COPY[stopReason]);
}

export function getSessionEndCopy(stopReason) {
  return SESSION_END_COPY[stopReason] ?? null;
}

const SHIFT_AUTO_CLOCK_OUT_COPY = SESSION_END_COPY.shift_ended;

async function alreadyNotifiedRecently({ userId, sessionId, title }) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existing = await notificationsTable
    .findOne({
      userId,
      type: "work_session",
      entityId: sessionId,
      createdAt: { $gte: oneHourAgo },
      title,
    })
    .lean();
  return Boolean(existing);
}

/**
 * Deliver realtime first (instant toast/OS), then persist + FCM in the background.
 * Previously socket waited on DB sequence + insert + FCM round-trips → late alerts.
 */
async function deliverWorkSessionAlert({
  userId,
  sessionId,
  stopReason,
  copy,
  realtimeEvent,
}) {
  if (await alreadyNotifiedRecently({ userId, sessionId, title: copy.title })) {
    return false;
  }

  const provisionalPayload = {
    id: null,
    type: "work_session",
    title: copy.title,
    body: copy.body,
    entityType: "work_session",
    entityId: sessionId,
    stopReason,
  };

  // 1) Instant path — socket only (no user DB lookup / FCM wait).
  emitToUsers([userId], realtimeEvent, provisionalPayload);
  emitToUsers([userId], "notification", provisionalPayload);

  // 2) Persist + push without blocking the auto clock-out caller.
  void (async () => {
    try {
      if (await alreadyNotifiedRecently({ userId, sessionId, title: copy.title })) {
        return;
      }
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId,
        type: "work_session",
        title: copy.title,
        body: copy.body,
        entityType: "work_session",
        entityId: sessionId,
        relatedId: sessionId,
        isRead: false,
      });

      const persisted = { ...provisionalPayload, id: notifId };
      // Refresh clients that only listen on the generic notification channel with an id.
      await notifyUser(userId, "notification", persisted);

      await sendWebPushToUser(userId, {
        title: copy.title,
        body: copy.body,
        data: {
          type: "work_session",
          entityType: "work_session",
          entityId: sessionId,
          stopReason,
        },
      });
    } catch (err) {
      logger.error(
        { err, userId, sessionId, stopReason },
        "Failed to persist/push work-session alert",
      );
    }
  })();

  return true;
}

/**
 * Notify when shift ends — auto clock-out, not a terminal session end.
 */
export async function notifyShiftAutoClockOut({ userId, sessionId }) {
  return deliverWorkSessionAlert({
    userId,
    sessionId,
    stopReason: "shift_ended",
    copy: SHIFT_AUTO_CLOCK_OUT_COPY,
    realtimeEvent: "shift_auto_clock_out",
  });
}

/**
 * Persist an in-app notification + realtime/FCM push when a work session is
 * auto-paused (sleep, shutdown, app close, day boundary, etc.).
 */
export async function notifyWorkSessionEnded({ userId, sessionId, stopReason }) {
  if (!shouldNotifySessionEnd(stopReason)) return false;
  const copy = SESSION_END_COPY[stopReason];
  return deliverWorkSessionAlert({
    userId,
    sessionId,
    stopReason,
    copy,
    realtimeEvent: "work_session_ended",
  });
}
