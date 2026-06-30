import mongoose, { Schema } from "mongoose";

const leadStatuses = ["new", "contacted", "follow_up", "interested", "project_planning", "proposal_sent", "approved", "converted", "lost"];
const leadPriorities = ["low", "medium", "high", "urgent"];

const reminderSchema = new Schema(
  { date: { type: Date, required: true }, note: { type: String, default: "" } },
  { _id: false }
);

const leadSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    company: { type: String, trim: true, default: null },
    address: { type: String, trim: true, default: null },
    position: { type: String, trim: true, default: null },
    source: { type: String, trim: true, default: null },
    contactChannel: { type: String, trim: true, default: null },
    status: { type: String, enum: leadStatuses, default: "new", required: true, index: true },
    priority: { type: String, enum: leadPriorities, default: "medium", required: true },
    assignedTo: { type: Number, ref: "Users", default: null, index: true },
    expectedValue: { type: Number, default: 0 },
    description: { type: String, default: null },
    reminder: { type: reminderSchema, default: null },
    tags: { type: [String], default: [] },
    planningDocs: {
      type: [{
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      }],
      default: [],
      _id: false,
    },
    customerId: { type: Number, ref: "SalesCustomers", default: null },
    clientId: { type: Number, ref: "Clients", default: null },
    proposalId: { type: Number, ref: "SalesProposals", default: null },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, assignedTo: 1 });
leadSchema.index({ email: 1 });

const SalesLeads = mongoose.models.SalesLeads || mongoose.model("SalesLeads", leadSchema);

export { SalesLeads, leadStatuses, leadPriorities };
