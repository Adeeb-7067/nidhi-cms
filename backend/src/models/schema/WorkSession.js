import mongoose, { Schema } from "mongoose";

const workSessionSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, ref: "Users", required: true, index: true },
  startedAt: { type: Date, default: Date.now, required: true },
  endedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true, index: true },
  deviceInfo: { type: String, default: null },
  stopReason: {
    type: String,
    enum: ["clock_out", "app_quit", "logout", "session_expired", "admin_terminated"],
    default: null,
  },
}, { timestamps: true });

workSessionSchema.index({ userId: 1, isActive: 1 });
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
