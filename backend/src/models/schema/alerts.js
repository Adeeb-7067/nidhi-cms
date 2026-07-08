import mongoose, { Schema } from "mongoose";
const alertAudienceTypes = ["user", "role", "all"];
const alertStatuses = ["scheduled", "sent", "cancelled"];
const alertSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  photoUrl: { type: String },
  scheduledAt: { type: Date, required: true, index: true },
  audienceType: { type: String, enum: alertAudienceTypes, required: true },
  targetUserId: { type: Number, ref: "Users" },
  targetRole: { type: String },
  status: { type: String, enum: alertStatuses, default: "scheduled", required: true, index: true },
  firedAt: { type: Date },
  createdBy: { type: Number, ref: "Users", required: true }
}, { timestamps: true });
const Alerts = mongoose.models.Alerts || mongoose.model("Alerts", alertSchema);
const alertsTable = Alerts;
export {
  Alerts,
  alertsTable,
  alertAudienceTypes,
  alertStatuses
};
