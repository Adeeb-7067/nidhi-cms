import mongoose, { Schema } from "mongoose";

const workSessionSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, ref: "Users", required: true, index: true },
  startedAt: { type: Date, default: Date.now, required: true },
  /**
   * Start of the current active segment (updated on every resume).
   * Shift-end auto clock-out uses this — not the original startedAt — so overtime
   * after shift end is never immediately closed again.
   */
  segmentStartedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true, index: true },
  deviceInfo: { type: String, default: null },
  stopReason: {
    type: String,
    enum: [
      "clock_out",
      "app_quit",
      "logout",
      "session_expired",
      "day_ended",
      "shift_ended",
      "admin_terminated",
      "admin_manual",
      "leave_approved",
      "system_sleep",
      "system_shutdown",
      "network_lost",
      "client_disconnected",
      /** Overtime segment paused — no recent user activity / heartbeat. */
      "overtime_idle",
    ],
    default: null,
  },
  lastHeartbeatAt: { type: Date, default: null },
  /**
   * Last real user interaction (mouse/keyboard/focus) reported by the client.
   * Overtime idle pause prefers this over lastHeartbeatAt so an open-but-idle
   * app does not keep accruing time.
   */
  lastUserActivityAt: { type: Date, default: null },
  /** Audit trail of pause/resume cycles within a single shift (same session id). */
  pausePeriods: {
    type: [
      {
        pausedAt: { type: Date, required: true },
        resumedAt: { type: Date, default: null },
        stopReason: { type: String, default: null },
      },
    ],
    default: [],
  },
}, { timestamps: true });

workSessionSchema.index({ userId: 1, isActive: 1 });
// Attendance/dashboard/payroll reads filter by userId set + startedAt range — without this,
// those range queries have no usable index on startedAt and fall back to scanning every
// session for the matched users.
workSessionSchema.index({ userId: 1, startedAt: 1 });
// Prevent two simultaneous active sessions for the same user at the DB level.
// partialFilterExpression limits the unique constraint to documents where isActive = true.
workSessionSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: "unique_active_session_per_user",
  }
);

const WorkSession = mongoose.models.WorkSession || mongoose.model("WorkSession", workSessionSchema);
const workSessionsTable = WorkSession;

export { WorkSession, workSessionsTable };
