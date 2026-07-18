import mongoose, { Schema } from "mongoose";
import {
  MARKETING_PACKAGES,
  MARKETING_PLATFORMS,
  MARKETING_ACCOUNT_STATUSES,
} from "../../../constants/marketing.js";

/**
 * Digital workspace for a CMS project (type=digital).
 * Manage company + digital project → Tasks / Media / Calendar / Ads.
 */
const marketingAccountSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    /** CMS company (Clients collection). */
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    /** Delivery project of type "digital" — one active account per project. */
    projectId: { type: Number, ref: "Projects", default: null, index: true },
    package: {
      type: String,
      enum: MARKETING_PACKAGES,
      default: "standard",
      required: true,
      index: true,
    },
    accountManagerId: { type: Number, ref: "Users", default: null, index: true },
    platforms: {
      type: [{ type: String, enum: MARKETING_PLATFORMS }],
      default: [],
    },
    monthlyBudgetInr: { type: Number, default: 0, min: 0 },
    renewalDate: { type: Date, default: null },
    status: {
      type: String,
      enum: MARKETING_ACCOUNT_STATUSES,
      default: "active",
      required: true,
      index: true,
    },
    /** Optional overrides when company profile is incomplete. */
    industry: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    performanceScore: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String, default: null, trim: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

marketingAccountSchema.index(
  { projectId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: { $ne: "ended" },
      projectId: { $type: "number" },
    },
  },
);
marketingAccountSchema.index({ companyId: 1, status: 1 });
marketingAccountSchema.index({ accountManagerId: 1, status: 1 });

const MarketingAccounts =
  mongoose.models.MarketingAccounts ||
  mongoose.model("MarketingAccounts", marketingAccountSchema);

export { MarketingAccounts };
