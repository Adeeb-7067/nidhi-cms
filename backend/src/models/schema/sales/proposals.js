import mongoose, { Schema } from "mongoose";

const proposalStatuses = [
  "draft",
  "sent",
  "seen",
  "approved",
  "declined",
  "counter_offer",
  "expired",
  "revised",
];

const proposalItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String, default: "" },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 18, min: 0, max: 100 },
  },
  { _id: false }
);

const proposalSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    number: { type: String, unique: true, required: true },
    title: { type: String, required: true, trim: true },
    leadId: { type: Number, ref: "SalesLeads", default: null, index: true },
    customerId: { type: Number, ref: "SalesCustomers", default: null, index: true },
    assignedTo: { type: Number, ref: "Users", default: null, index: true },
    status: { type: String, enum: proposalStatuses, default: "draft", required: true, index: true },
    items: { type: [proposalItemSchema], default: [] },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    totalAdjustment: { type: Number, default: 0 },
    adjustedTotal: { type: Number, default: null, min: 0 },
    validUntil: { type: Date, default: null },
    clientNote: { type: String, default: "" },
    terms: { type: String, default: "" },
    internalNotes: { type: String, default: "" },
    revision: { type: Number, default: 1, min: 1 },
    viewToken: { type: String, unique: true, required: true },
    sentAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    declinedReason: { type: String, default: null },
    counterOfferNote: { type: String, default: null },
    approvalNote: { type: String, default: null },
    clientSignature: { type: String, default: null },
    projectId: { type: Number, ref: "Projects", default: null },
  },
  { timestamps: true }
);

proposalSchema.index({ createdAt: -1 });
proposalSchema.index({ viewToken: 1 });

const SalesProposals =
  mongoose.models.SalesProposals || mongoose.model("SalesProposals", proposalSchema);

export { SalesProposals, proposalStatuses };
