import mongoose, { Schema } from "mongoose";

const proposalLogEvents = ["viewed", "approved", "declined", "counter_offer"];

const proposalLogSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    proposalId: { type: Number, required: true, index: true },
    event: { type: String, enum: proposalLogEvents, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    reason: { type: String, default: null },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

proposalLogSchema.index({ proposalId: 1, createdAt: -1 });

const SalesProposalLogs =
  mongoose.models.SalesProposalLogs ||
  mongoose.model("SalesProposalLogs", proposalLogSchema);

export { SalesProposalLogs, proposalLogEvents };
