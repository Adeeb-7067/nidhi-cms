import mongoose, { Schema } from "mongoose";
import {
  MARKETING_PLATFORMS,
  MARKETING_APPROVAL_STAGES,
  MARKETING_POST_SCHEDULE_STATUSES,
} from "../../../constants/marketing.js";

const marketingPostSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    platform: { type: String, enum: MARKETING_PLATFORMS, required: true, index: true },
    caption: { type: String, default: "", trim: true },
    hashtags: { type: [String], default: [] },
    scheduledAt: { type: Date, default: null, index: true },
    approvalStage: {
      type: String,
      enum: MARKETING_APPROVAL_STAGES,
      default: "internal_review",
      required: true,
      index: true,
    },
    scheduleStatus: {
      type: String,
      enum: MARKETING_POST_SCHEDULE_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    assigneeId: { type: Number, ref: "Users", default: null, index: true },
    mediaIds: { type: [Number], default: [] },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

marketingPostSchema.index({ scheduledAt: 1, scheduleStatus: 1 });

const MarketingPosts =
  mongoose.models.MarketingPosts || mongoose.model("MarketingPosts", marketingPostSchema);

export { MarketingPosts };
