import mongoose, { Schema } from "mongoose";
const projectStatuses = ["scoping", "in_progress", "on_hold", "uat", "completed", "maintenance"];
const projectPriorities = ["low", "medium", "high", "critical"];
const milestoneStatuses = ["pending", "completed", "delayed"];
const apkAudiences = ["team_only", "client_visible", "all_visible"];
const projectSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  logoUrl: { type: String },
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
  completionOverride: { type: Number }
}, { timestamps: true });
projectSchema.index({ companyId: 1, status: 1 });
projectSchema.index({ companyId: 1, deadline: 1 });
const Projects = mongoose.models.Projects || mongoose.model("Projects", projectSchema);
const projectMemberSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  userId: { type: Number, ref: "Users", required: true, index: true },
  subType: { type: String },
  completionPct: { type: Number, default: 0, required: true },
  joinedAt: { type: Date, default: Date.now, required: true }
});
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
const ProjectMembers = mongoose.models.ProjectMembers || mongoose.model("ProjectMembers", projectMemberSchema);
const apkScheduleSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  scheduledDate: { type: Date, required: true },
  label: { type: String, required: true },
  audience: { type: String, enum: apkAudiences, default: "team_only", required: true },
  createdAt: { type: Date, default: Date.now }
});
const ApkSchedules = mongoose.models.ApkSchedules || mongoose.model("ApkSchedules", apkScheduleSchema);
const milestoneSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  title: { type: String, required: true },
  plannedDate: { type: Date, required: true },
  actualDate: { type: Date },
  status: { type: String, enum: milestoneStatuses, default: "pending", required: true },
  createdAt: { type: Date, default: Date.now }
});
const Milestones = mongoose.models.Milestones || mongoose.model("Milestones", milestoneSchema);
const projectsTable = Projects;
const projectMembersTable = ProjectMembers;
const apkSchedulesTable = ApkSchedules;
const milestonesTable = Milestones;
export {
  ApkSchedules,
  Milestones,
  ProjectMembers,
  Projects,
  apkAudiences,
  apkSchedulesTable,
  milestoneStatuses,
  milestonesTable,
  projectMembersTable,
  projectPriorities,
  projectStatuses,
  projectsTable
};
