import mongoose, { Schema } from "mongoose";
import { dailyAttendanceSources } from "../../../constants/hrm-workflow.js";

const dailyAttendanceSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  date: { type: String, required: true, index: true },
  timezone: { type: String, default: "UTC" },
  status: { type: String, required: true, index: true },
  compliance: { type: String, required: true },
  expectedMinutes: { type: Number, default: 0 },
  activeMinutes: { type: Number, default: 0 },
  varianceMinutes: { type: Number, default: 0 },
  sessionCount: { type: Number, default: 0 },
  threshold: { type: Number, default: 0 },
  missingClockOut: { type: Boolean, default: false },
  partialLeave: { type: Boolean, default: false },
  leaveDayPart: { type: String },
  leaveRequestId: { type: Number },
  wfhRequestId: { type: Number },
  holidayId: { type: Number },
  globalWfh: { type: Boolean, default: false },
  late: { type: Boolean, default: false },
  lateMinutes: { type: Number, default: 0 },
  forgivenLate: { type: Boolean, default: false },
  corrected: { type: Boolean, default: false },
  correctionId: { type: Number },
  source: { type: String, enum: dailyAttendanceSources, default: "engine", index: true },
  lockedForPayroll: { type: Boolean, default: false },
  materializedAt: { type: Date },
}, { timestamps: true });

dailyAttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
dailyAttendanceSchema.index({ date: 1, status: 1 });
dailyAttendanceSchema.index({ date: 1, lockedForPayroll: 1 });

const DailyAttendance =
  mongoose.models.DailyAttendance || mongoose.model("DailyAttendance", dailyAttendanceSchema);
const dailyAttendanceTable = DailyAttendance;

export { DailyAttendance, dailyAttendanceTable };
