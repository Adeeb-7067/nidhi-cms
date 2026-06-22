import { sessionsTable, usersTable } from "../models/schema/index.js";
import { evictUserFromAuthCache } from "../middlewares/auth.js";

export const ACTIVE_USER_STATUS = "active";

export function isUserAccountActive(user) {
  return Boolean(user && user.status === ACTIVE_USER_STATUS);
}

/** Realtime events that must reach the client even after deactivation (e.g. force logout). */
export const REALTIME_EVENTS_WHEN_INACTIVE = new Set(["user_deactivated"]);

/**
 * Revoke access when an account is deactivated or suspended:
 * invalidate refresh sessions, silently clock out, clear push tokens.
 */
export async function revokeUserAccess(userId) {
  evictUserFromAuthCache(userId);
  const { clockOut } = await import("./work-sessions.service.js");
  await Promise.all([
    sessionsTable.deleteMany({ userId }),
    clockOut(userId, "clock_out"),
    usersTable.updateOne({ id: userId }, { $set: { fcmTokens: [] } }),
  ]);
}
