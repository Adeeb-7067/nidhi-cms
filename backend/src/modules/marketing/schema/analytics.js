import mongoose, { Schema } from "mongoose";
import {
  MARKETING_PLATFORMS,
  MARKETING_RANKING_TRENDS,
} from "../../../constants/marketing.js";

const marketingSocialMetricSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    platform: { type: String, enum: MARKETING_PLATFORMS, required: true, index: true },
    followers: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    bestPostTitle: { type: String, default: "" },
    worstPostTitle: { type: String, default: "" },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
  },
  { timestamps: true },
);

marketingSocialMetricSchema.index(
  { accountId: 1, platform: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

const marketingSeoKeywordSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    keyword: { type: String, required: true, trim: true },
    currentRank: { type: Number, default: 0 },
    previousRank: { type: Number, default: 0 },
    trend: { type: String, enum: MARKETING_RANKING_TRENDS, default: "stable" },
    searchVolume: { type: Number, default: 0 },
    url: { type: String, default: "" },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
  },
  { timestamps: true },
);

const marketingSeoAuditSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    issues: { type: Number, default: 0, min: 0 },
    lastAuditDate: { type: Date, default: Date.now },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
  },
  { timestamps: true },
);

const MarketingSocialMetrics =
  mongoose.models.MarketingSocialMetrics ||
  mongoose.model("MarketingSocialMetrics", marketingSocialMetricSchema);
const MarketingSeoKeywords =
  mongoose.models.MarketingSeoKeywords ||
  mongoose.model("MarketingSeoKeywords", marketingSeoKeywordSchema);
const MarketingSeoAudits =
  mongoose.models.MarketingSeoAudits ||
  mongoose.model("MarketingSeoAudits", marketingSeoAuditSchema);

export { MarketingSocialMetrics, MarketingSeoKeywords, MarketingSeoAudits };
