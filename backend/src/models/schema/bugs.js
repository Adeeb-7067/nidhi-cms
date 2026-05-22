import mongoose, { Schema } from "mongoose";
const bugSeverities = ["critical", "high", "medium", "low"];
const bugPriorities = ["p1", "p2", "p3", "p4"];
const bugStatuses = ["open", "in_progress", "fixed", "verified", "wont_fix", "duplicate"];
const bugPlatforms = ["android", "ios", "web", "api", "all"];
const bugSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  bugNumber: { type: String, unique: true, required: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  reporterId: { type: Number, ref: "Users", required: true, index: true },
  assigneeId: { type: Number, ref: "Users" },
  title: { type: String, required: true },
  description: { type: String },
  stepsToReproduce: { type: String },
  expectedBehavior: { type: String },
  actualBehavior: { type: String },
  severity: { type: String, enum: bugSeverities, default: "medium", required: true },
  priority: { type: String, enum: bugPriorities, default: "p3", required: true },
  status: { type: String, enum: bugStatuses, default: "open", required: true, index: true },
  buildVersion: { type: String },
  platform: { type: String, enum: bugPlatforms, default: "web", required: true },
  resolvedAt: { type: Date },
  attachmentUrl: { type: String }
}, { timestamps: true });
bugSchema.index({ createdAt: -1 });
const Bugs = mongoose.models.Bugs || mongoose.model("Bugs", bugSchema);
const bugsTable = Bugs;
export {
  Bugs,
  bugPlatforms,
  bugPriorities,
  bugSeverities,
  bugStatuses,
  bugsTable
};
