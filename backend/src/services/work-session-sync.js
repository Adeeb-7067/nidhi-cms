import { notifyUser } from "../lib/realtime.js";

/** Push session state to all of a user's connected clients (web + desktop tabs). */
export function broadcastWorkSessionSync(userId, payload) {
  if (!userId) return;
  notifyUser(userId, "work_session_sync", payload);
}
