import mongoose, { Schema } from "mongoose";
import { apkAudiences } from "./projects.js";
const apkReleaseTypes = ["alpha", "beta", "rc", "production"];
const apkPlatforms = ["android", "ios"];
const apkReleaseSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  uploaderId: { type: Number, ref: "Users", required: true },
  name: { type: String, trim: true },
  version: { type: String, required: true },
  buildNumber: { type: Number, required: true },
  releaseType: { type: String, enum: apkReleaseTypes, default: "alpha", required: true },
  changelog: { type: String },
  platform: { type: String, enum: apkPlatforms, default: "android", required: true },
  minOsVersion: { type: String },
  fileUrl: { type: String, required: true },
  audience: { type: String, enum: apkAudiences, default: "team_only", required: true },
  apkScheduleId: { type: Number, ref: "ApkSchedules" },
  createdAt: { type: Date, default: Date.now }
});
const ApkReleases = mongoose.models.ApkReleases || mongoose.model("ApkReleases", apkReleaseSchema);
const apkDownloadLogSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  apkReleaseId: { type: Number, ref: "ApkReleases", required: true },
  userId: { type: Number, ref: "Users" },
  ipAddress: { type: String },
  downloadedAt: { type: Date, default: Date.now }
});
const ApkDownloadLogs = mongoose.models.ApkDownloadLogs || mongoose.model("ApkDownloadLogs", apkDownloadLogSchema);
const apkReleasesTable = ApkReleases;
const apkDownloadLogsTable = ApkDownloadLogs;
export {
  ApkDownloadLogs,
  ApkReleases,
  apkDownloadLogsTable,
  apkPlatforms,
  apkReleaseTypes,
  apkReleasesTable
};
