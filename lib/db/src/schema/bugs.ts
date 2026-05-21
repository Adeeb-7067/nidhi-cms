import mongoose, { Schema } from "mongoose";

export const bugSeverities = ["critical", "high", "medium", "low"] as const;
export const bugPriorities = ["p1", "p2", "p3", "p4"] as const;
export const bugStatuses = ["open", "in_progress", "fixed", "verified", "wont_fix", "duplicate"] as const;
export const bugPlatforms = ["android", "ios", "web", "api", "all"] as const;

export type BugSeverity = typeof bugSeverities[number];
export type BugPriority = typeof bugPriorities[number];
export type BugStatus = typeof bugStatuses[number];
export type BugPlatform = typeof bugPlatforms[number];

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
  attachmentUrl: { type: String },
}, { timestamps: true });

// Compound search index if applicable or basic indices
bugSchema.index({ createdAt: -1 });

export const Bugs = mongoose.models.Bugs || mongoose.model("Bugs", bugSchema);

export interface Bug {
  id: number;
  bugNumber: string;
  companyId: number | null;
  projectId: number;
  reporterId: number;
  assigneeId: number | null;
  title: string;
  description: string | null;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  buildVersion: string | null;
  platform: BugPlatform;
  createdAt: Date;
  resolvedAt: Date | null;
  attachmentUrl?: string | null;
  updatedAt: Date;
}

export const bugsTable = Bugs;
