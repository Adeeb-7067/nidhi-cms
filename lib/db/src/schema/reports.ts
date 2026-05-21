import mongoose, { Schema } from "mongoose";

export const reportTypes = ["developer_monthly", "project_progress", "bug_report", "team_utilisation", "client_dossier", "apk_release_history", "raw_log_export"] as const;
export const reportStatuses = ["queued", "generating", "ready", "failed"] as const;

export type ReportType = typeof reportTypes[number];
export type ReportStatus = typeof reportStatuses[number];

const reportSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  type: { type: String, enum: reportTypes, required: true },
  status: { type: String, enum: reportStatuses, default: "queued", required: true },
  requestedBy: { type: Number, ref: "Users", required: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", index: true },
  month: { type: Number },
  year: { type: Number },
  includeDescriptions: { type: Boolean, default: false, required: true },
  fileUrl: { type: String },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const Reports = mongoose.models.Reports || mongoose.model("Reports", reportSchema);

export interface Report {
  id: number;
  type: ReportType;
  status: ReportStatus;
  requestedBy: number;
  companyId: number | null;
  projectId: number | null;
  month: number | null;
  year: number | null;
  includeDescriptions: boolean;
  fileUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export const reportsTable = Reports;
