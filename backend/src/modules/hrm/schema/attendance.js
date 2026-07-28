import mongoose, { Schema } from "mongoose";
import { correctionStatuses } from "../../../constants/hrm.js";

const attendanceCorrectionSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  date: { type: String, required: true, index: true },
  reason: { type: String, required: true },
  requestedStatus: { type: String },
  requestedActiveMinutes: { type: Number },
  status: { type: String, enum: correctionStatuses, default: "pending", index: true },
  reviewedBy: { type: Number },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
}, { timestamps: true });

attendanceCorrectionSchema.index({ userId: 1, status: 1, createdAt: -1 });
attendanceCorrectionSchema.index({ status: 1, date: 1 });
attendanceCorrectionSchema.index({ userId: 1, date: 1, status: 1 });

const AttendanceCorrections = mongoose.models.AttendanceCorrections || mongoose.model("AttendanceCorrections", attendanceCorrectionSchema);
const attendanceCorrectionsTable = AttendanceCorrections;

export { AttendanceCorrections, attendanceCorrectionsTable };
