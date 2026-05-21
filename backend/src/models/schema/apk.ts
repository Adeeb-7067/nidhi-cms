import mongoose, { Schema } from "mongoose";
import { apkAudiences, ApkAudience } from "./projects";

export const apkReleaseTypes = ["alpha", "beta", "rc", "production"] as const;
export const apkPlatforms = ["android", "ios"] as const;

export type ApkReleaseType = typeof apkReleaseTypes[number];
export type ApkPlatform = typeof apkPlatforms[number];

const apkReleaseSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  uploaderId: { type: Number, ref: "Users", required: true },
  version: { type: String, required: true },
  buildNumber: { type: Number, required: true },
  releaseType: { type: String, enum: apkReleaseTypes, default: "alpha", required: true },
  changelog: { type: String },
  platform: { type: String, enum: apkPlatforms, default: "android", required: true },
  minOsVersion: { type: String },
  fileUrl: { type: String, required: true },
  audience: { type: String, enum: apkAudiences, default: "team_only", required: true },
  apkScheduleId: { type: Number, ref: "ApkSchedules" },
  createdAt: { type: Date, default: Date.now },
});

export const ApkReleases = mongoose.models.ApkReleases || mongoose.model("ApkReleases", apkReleaseSchema);

const apkDownloadLogSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  apkReleaseId: { type: Number, ref: "ApkReleases", required: true },
  userId: { type: Number, ref: "Users" },
  ipAddress: { type: String },
  downloadedAt: { type: Date, default: Date.now },
});

export const ApkDownloadLogs = mongoose.models.ApkDownloadLogs || mongoose.model("ApkDownloadLogs", apkDownloadLogSchema);

export interface ApkRelease {
  id: number;
  companyId: number | null;
  projectId: number;
  uploaderId: number;
  version: string;
  buildNumber: number;
  releaseType: ApkReleaseType;
  changelog: string | null;
  platform: ApkPlatform;
  minOsVersion: string | null;
  fileUrl: string;
  audience: ApkAudience;
  apkScheduleId: number | null;
  createdAt: Date;
}

export const apkReleasesTable = ApkReleases;
export const apkDownloadLogsTable = ApkDownloadLogs;
