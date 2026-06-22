import mongoose, { Schema } from "mongoose";
import { wfhRequestStatuses } from "../../../constants/hrm.js";

const wfhRequestSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  startDate: { type: String, required: true, index: true },
  endDate: { type: String, required: true },
  days: { type: Number, default: 1 },
  reason: { type: String, required: true },
  phoneNumber: { type: String },
  status: { type: String, enum: wfhRequestStatuses, default: "pending", index: true },
  reviewedBy: { type: Number, ref: "Users" },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
}, { timestamps: true });

wfhRequestSchema.index({ userId: 1, status: 1, startDate: 1, endDate: 1 });
wfhRequestSchema.index({ status: 1, createdAt: -1 });

const WfhRequests = mongoose.models.WfhRequests || mongoose.model("WfhRequests", wfhRequestSchema);
const wfhRequestsTable = WfhRequests;

export { WfhRequests, wfhRequestsTable };
