import mongoose, { Schema } from "mongoose";
import {
  MARKETING_CAMPAIGN_STATUSES,
  MARKETING_META_OBJECTIVES,
  MARKETING_GOOGLE_TYPES,
} from "../../../constants/marketing.js";

const marketingCampaignSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    /** meta | google */
    network: { type: String, enum: ["meta", "google"], required: true, index: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: MARKETING_CAMPAIGN_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    budgetInr: { type: Number, default: 0, min: 0 },
    // Meta fields
    objective: {
      type: String,
      enum: MARKETING_META_OBJECTIVES,
      required: false,
      default: undefined,
    },
    audience: { type: String, default: null },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
    // Google fields
    googleType: {
      type: String,
      enum: MARKETING_GOOGLE_TYPES,
      required: false,
      default: undefined,
    },
    keywords: { type: [String], default: [] },
    qualityScore: { type: Number, default: 0 },
    cpa: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

marketingCampaignSchema.index({ network: 1, status: 1 });

const MarketingCampaigns =
  mongoose.models.MarketingCampaigns ||
  mongoose.model("MarketingCampaigns", marketingCampaignSchema);

export { MarketingCampaigns };
