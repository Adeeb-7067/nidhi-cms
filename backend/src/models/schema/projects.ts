import mongoose, { Schema } from "mongoose";

export const projectStatuses = ["scoping", "in_progress", "on_hold", "uat", "completed", "maintenance"] as const;
export const projectPriorities = ["low", "medium", "high", "critical"] as const;
export const milestoneStatuses = ["pending", "completed", "delayed"] as const;
export const apkAudiences = ["team_only", "client_visible"] as const;

export type ProjectStatus = typeof projectStatuses[number];
export type ProjectPriority = typeof projectPriorities[number];
export type MilestoneStatus = typeof milestoneStatuses[number];
export type ApkAudience = typeof apkAudiences[number];

// 1. Projects Schema
const projectSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  companyId: { type: Number, ref: "Clients", index: true },
  clientId: { type: Number, ref: "Clients", required: true, index: true },
  pmId: { type: Number, ref: "Users" },
  description: { type: String },
  status: { type: String, enum: projectStatuses, default: "scoping", required: true, index: true },
  type: { type: String, enum: ["development", "maintenance"], default: "development", required: true, index: true },
  priority: { type: String, enum: projectPriorities, default: "medium", required: true },
  startDate: { type: Date, required: true },
  deadline: { type: Date, required: true },
  techStack: { type: [String], default: [], required: true },
  figmaUrl: { type: String },
  repoUrl: { type: String },
  stagingUrl: { type: String },
  productionUrl: { type: String },
  adminUrl: { type: String },
  websiteUrl: { type: String },
  postmanJson: { type: String },
  completionOverride: { type: Number },
}, { timestamps: true });

projectSchema.index({ companyId: 1, status: 1 });
projectSchema.index({ companyId: 1, deadline: 1 });

export const Projects = mongoose.models.Projects || mongoose.model("Projects", projectSchema);

// 2. Project Members Schema
const projectMemberSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  userId: { type: Number, ref: "Users", required: true, index: true },
  subType: { type: String },
  completionPct: { type: Number, default: 0, required: true },
  joinedAt: { type: Date, default: Date.now, required: true },
});

export const ProjectMembers = mongoose.models.ProjectMembers || mongoose.model("ProjectMembers", projectMemberSchema);

// 3. Apk Schedules Schema
const apkScheduleSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  scheduledDate: { type: Date, required: true },
  label: { type: String, required: true },
  audience: { type: String, enum: apkAudiences, default: "team_only", required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ApkSchedules = mongoose.models.ApkSchedules || mongoose.model("ApkSchedules", apkScheduleSchema);

// 4. Milestones Schema
const milestoneSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  title: { type: String, required: true },
  plannedDate: { type: Date, required: true },
  actualDate: { type: Date },
  status: { type: String, enum: milestoneStatuses, default: "pending", required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Milestones = mongoose.models.Milestones || mongoose.model("Milestones", milestoneSchema);

// Backward compatibility interfaces
export interface Project {
  id: number;
  name: string;
  companyId: number | null;
  clientId: number;
  pmId: number | null;
  description: string | null;
  status: ProjectStatus;
  type: "development" | "maintenance";
  priority: ProjectPriority;
  startDate: Date;
  deadline: Date;
  techStack: string[];
  figmaUrl: string | null;
  repoUrl: string | null;
  stagingUrl: string | null;
  productionUrl: string | null;
  adminUrl: string | null;
  websiteUrl: string | null;
  postmanJson: string | null;
  completionOverride: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  subType: string | null;
  completionPct: number;
  joinedAt: Date;
}

export interface ApkSchedule {
  id: number;
  projectId: number;
  scheduledDate: Date;
  label: string;
  audience: ApkAudience;
  createdAt: Date;
}

export interface Milestone {
  id: number;
  projectId: number;
  title: string;
  plannedDate: Date;
  actualDate: Date | null;
  status: MilestoneStatus;
  createdAt: Date;
}

export const projectsTable = Projects;
export const projectMembersTable = ProjectMembers;
export const apkSchedulesTable = ApkSchedules;
export const milestonesTable = Milestones;
