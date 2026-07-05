import { clockOut } from "../work-sessions.service.js";
import { broadcastWorkSessionSync } from "../work-session-sync.js";
import { logger } from "../../lib/logger.js";

/** True when full-day approved leave covers the given work-day key. */
export function shouldClockOutForApprovedLeave(request, todayKey) {
  if (request?.status !== "approved") return false;
  const dayPart = request.dayPart ?? "full";
  if (dayPart !== "full") return false;
  if (!todayKey || !request.startDate || !request.endDate) return false;
  return request.startDate <= todayKey && request.endDate >= todayKey;
}

/** End an active work session when full-day leave is approved for today. */
export async function clockOutActiveSessionForApprovedLeave(request, todayKey) {
  if (!shouldClockOutForApprovedLeave(request, todayKey)) {
    return { clockedOut: false };
  }

  try {
    const session = await clockOut(request.userId, "leave_approved");
    if (session) {
      broadcastWorkSessionSync(request.userId, {
        action: "clock_out",
        session: null,
        stopReason: "leave_approved",
      });
    }
    return { clockedOut: Boolean(session) };
  } catch (err) {
    logger.error(
      { err, userId: request.userId, leaveRequestId: request.id, todayKey },
      "Failed to clock out employee after full-day leave approval",
    );
    return { clockedOut: false, error: err?.message ?? String(err) };
  }
}
