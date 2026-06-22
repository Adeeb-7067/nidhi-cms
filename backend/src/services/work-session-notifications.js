import { notificationsTable, getNextSequence } from "../models/schema/index.js";
import { notifyUser } from "../lib/realtime.js";
import { sendWebPushToUser } from "./push-notifications.js";

/** User-facing copy when a session ends without manual clock-out. */
const SESSION_END_COPY = {
  network_lost: {
    title: "Work session ended",
    body: "Your session ended after prolonged loss of network connectivity. Clock in again today to continue the same shift.",
  },
  system_sleep: {
    title: "Work session ended",
    body: "Your session ended when your PC went to sleep. Clock in again today to continue the same shift.",
  },
  system_shutdown: {
    title: "Work session ended",
    body: "Your session ended because your PC is shutting down. Clock in again today to continue the same shift.",
  },
  app_quit: {
    title: "Work session ended",
    body: "Your session ended when the desktop app was closed. Clock in again today to continue the same shift.",
  },
  logout: {
    title: "Work session ended",
    body: "Your session ended when you logged out. Clock in again today to continue the same shift.",
  },
  client_disconnected: {
    title: "Work session ended",
    body: "Your session ended — the desktop app stopped sending heartbeats for 10+ minutes. Open the app and clock in again today to continue.",
  },
  session_expired: {
    title: "Work session ended",
    body: "Your session reached the 24-hour limit and was closed automatically. Clock in to start today’s shift.",
  },
  day_ended: {
    title: "Work session ended",
    body: "A new work day started — your previous session was closed. Clock in to start today’s shift.",
  },
  admin_terminated: {
    title: "Work session ended by admin",
    body: "An administrator ended your work session. Clock in again when you are ready to work.",
  },
};

export function shouldNotifySessionEnd(stopReason) {
  return Boolean(stopReason && stopReason !== "clock_out" && SESSION_END_COPY[stopReason]);
}

export function getSessionEndCopy(stopReason) {
  return SESSION_END_COPY[stopReason] ?? null;
}

/**
 * Persist an in-app notification + realtime/FCM push when a work session ends
 * for reasons the employee may not notice (app closed, network loss, server cleanup).
 */
export async function notifyWorkSessionEnded({ userId, sessionId, stopReason }) {
  if (!shouldNotifySessionEnd(stopReason)) return false;

  const copy = SESSION_END_COPY[stopReason];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existing = await notificationsTable
    .findOne({
      userId,
      type: "work_session",
      entityId: sessionId,
      createdAt: { $gte: oneHourAgo },
    })
    .lean();
  if (existing) return false;

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

  const payload = {
    id: notifId,
    type: "work_session",
    title: copy.title,
    body: copy.body,
    entityType: "work_session",
    entityId: sessionId,
    stopReason,
  };

  await notifyUser(userId, "notification", payload);
  await notifyUser(userId, "work_session_ended", payload);
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
  return true;
}
