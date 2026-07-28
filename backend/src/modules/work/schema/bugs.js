import mongoose, { Schema } from "mongoose";

const bugSeverities = ["critical", "high", "medium", "low"];
const bugPriorities = ["p1", "p2", "p3", "p4"];
const trackStatuses = ["open", "fixed"];
const finalStatuses = ["open", "resolved"];
const bugStatuses = [
  "reported",
  "assigned",
  "in_progress",
  "fixed",
  "pending_qa_verification",
  "reopened",
  "closed",
  "open",
  "verified",
  "wont_fix",
  "duplicate",
];

const bugAttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String },
    mimeType: { type: String },
    uploadedBy: { type: Number },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } },
);

/** Embedded line items for batch reports — one Mongo doc, no duplicate rows */
const bugIssueSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    qaStatus: { type: String, enum: trackStatuses, default: "open" },
    devStatus: { type: String, enum: trackStatuses, default: "open" },
    finalStatus: { type: String, enum: finalStatuses, default: "open" },
  },
  { _id: false },
);

const bugPlatforms = ["android", "ios", "web", "api", "all"];

const bugSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    bugNumber: { type: String, unique: true, required: true },
    companyId: { type: Number, ref: "Clients", index: true },
    projectId: { type: Number, ref: "Projects", required: true, index: true },
    reporterId: { type: Number, ref: "Users", required: true, index: true },
    assigneeId: { type: Number, ref: "Users" },
    assigneeIds: { type: [Number], default: [] },
    title: { type: String, required: true },
    description: { type: String },
    stepsToReproduce: { type: String },
    expectedBehavior: { type: String },
    actualBehavior: { type: String },
    severity: { type: String, enum: bugSeverities, default: "medium", required: true },
    priority: { type: String, enum: bugPriorities, default: "p3", required: true },
    /** Legacy — derived on write from track fields */
    status: { type: String, enum: bugStatuses, default: "reported", index: true },
    qaStatus: { type: String, enum: trackStatuses, default: "open", index: true },
    devStatus: { type: String, enum: trackStatuses, default: "open", index: true },
    finalStatus: { type: String, enum: finalStatuses, default: "open", index: true },
    issues: { type: [bugIssueSchema], default: [] },
    buildVersion: { type: String },
    platform: { type: String, enum: bugPlatforms, default: "web", required: true },
    resolvedAt: { type: Date },
    attachmentUrl: { type: String },
    attachments: { type: [bugAttachmentSchema], default: [] },
    /** Legacy batch children — not used for new reports */
    parentBugId: { type: Number, default: null, index: true },
  },
  { timestamps: true },
);

bugSchema.index({ createdAt: -1 });
bugSchema.index({ assigneeIds: 1 });
bugSchema.index({ projectId: 1, finalStatus: 1 });

const Bugs = mongoose.models.Bugs || mongoose.model("Bugs", bugSchema);
const bugsTable = Bugs;

export {
  Bugs,
  bugIssueSchema,
  bugPlatforms,
  bugPriorities,
  bugSeverities,
  bugStatuses,
  bugsTable,
  finalStatuses,
  trackStatuses,
};
