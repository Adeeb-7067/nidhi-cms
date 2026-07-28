import mongoose, { Schema } from "mongoose";

const warningStatuses = ["active", "revoked"];

const warningSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  targetUserId: { type: Number, ref: "Users", required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  // Inclusive display window. startDate is stored at the start of the day and
  // endDate at the end of the day so the warning shows for the whole period.
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  status: { type: String, enum: warningStatuses, default: "active", required: true, index: true },
  createdBy: { type: Number, ref: "Users", required: true },
}, { timestamps: true });

const Warnings = mongoose.models.Warnings || mongoose.model("Warnings", warningSchema);
const warningsTable = Warnings;

export {
  Warnings,
  warningsTable,
  warningStatuses,
};
