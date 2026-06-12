import { workSessionsTable, getNextSequence } from "../models/schema/index.js";
import { notFound } from "../utils/route-errors.js";

export async function clockIn(userId, deviceInfo) {
  // Close any lingering active sessions for this user before creating a new one
  await workSessionsTable.updateMany(
    { userId, isActive: true },
    { $set: { isActive: false, endedAt: new Date() } }
  );

  const id = await getNextSequence("workSession");
  const session = await workSessionsTable.create({
    id,
    userId,
    startedAt: new Date(),
    endedAt: null,
    isActive: true,
    deviceInfo: deviceInfo ?? null,
  });
  return session;
}

export async function clockOut(userId, stopReason = "clock_out") {
  const session = await workSessionsTable.findOneAndUpdate(
    { userId, isActive: true },
    { $set: { isActive: false, endedAt: new Date(), stopReason } },
    { new: true }
  );
  return session ?? null;
}

export async function forceClockOutAll(stopReason = "session_expired") {
  // Used by admin to terminate all active sessions (e.g. after a policy change)
  const result = await workSessionsTable.updateMany(
    { isActive: true },
    { $set: { isActive: false, endedAt: new Date(), stopReason } }
  );
  return result.modifiedCount;
}

export async function getActiveSession(userId) {
  return workSessionsTable.findOne({ userId, isActive: true }).lean();
}

export async function listSessions(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  // userId === null means "all users" (admin only — enforced in controller)
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
    { new: true }
  );
  return session ?? null;
}
