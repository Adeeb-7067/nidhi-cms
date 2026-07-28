import mongoose, { Schema } from "mongoose";
const reportTypes = ["developer_monthly", "project_progress", "bug_report", "team_utilisation", "client_dossier", "apk_release_history", "raw_log_export"];
const reportStatuses = ["queued", "generating", "ready", "failed"];
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
  createdAt: { type: Date, default: Date.now }
});
const Reports = mongoose.models.Reports || mongoose.model("Reports", reportSchema);
const reportsTable = Reports;
export {
  Reports,
  reportStatuses,
  reportTypes,
  reportsTable
};
