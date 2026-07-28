import mongoose, { Schema } from "mongoose";

const followupTypes = ["call", "email", "meeting", "demo"];
const followupStatuses = ["scheduled", "completed", "overdue", "cancelled"];

const followupSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    leadId: { type: Number, ref: "SalesLeads", required: true, index: true },
    type: { type: String, enum: followupTypes, required: true },
    status: { type: String, enum: followupStatuses, default: "scheduled", required: true, index: true },
    scheduledAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    executiveId: { type: Number, ref: "Users", default: null, index: true },
  },
  { timestamps: true }
);

followupSchema.index({ scheduledAt: 1, status: 1 });

const SalesFollowUps =
  mongoose.models.SalesFollowUps || mongoose.model("SalesFollowUps", followupSchema);

export { SalesFollowUps, followupTypes, followupStatuses };
