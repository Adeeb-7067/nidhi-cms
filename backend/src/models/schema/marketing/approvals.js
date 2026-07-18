import mongoose, { Schema } from "mongoose";
import { MARKETING_APPROVAL_STAGES } from "../../../constants/marketing.js";

const APPROVAL_TYPES = ["graphic", "video", "content", "post", "ad", "other"];

const marketingApprovalSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: APPROVAL_TYPES, default: "other", required: true, index: true },
    /** Optional link to source entity (post/task/etc.). */
    refType: { type: String, default: null },
    refId: { type: Number, default: null, index: true },
    stage: {
      type: String,
      enum: MARKETING_APPROVAL_STAGES,
      default: "internal_review",
      required: true,
      index: true,
    },
    assigneeId: { type: Number, ref: "Users", default: null, index: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

marketingApprovalSchema.index({ stage: 1, updatedAt: -1 });

const MarketingApprovals =
  mongoose.models.MarketingApprovals ||
  mongoose.model("MarketingApprovals", marketingApprovalSchema);

export { MarketingApprovals };
