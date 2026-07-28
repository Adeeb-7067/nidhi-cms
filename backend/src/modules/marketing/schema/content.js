import mongoose, { Schema } from "mongoose";
import {
  MARKETING_APPROVAL_STAGES,
  MARKETING_CONTENT_TYPES,
} from "../../../constants/marketing.js";

const marketingContentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: MARKETING_CONTENT_TYPES,
      default: "blog",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: MARKETING_APPROVAL_STAGES,
      default: "internal_review",
      required: true,
      index: true,
    },
    seoScore: { type: Number, default: 0, min: 0, max: 100 },
    wordCount: { type: Number, default: 0, min: 0 },
    assigneeId: { type: Number, ref: "Users", default: null, index: true },
    dueDate: { type: Date, default: null, index: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const MarketingContent =
  mongoose.models.MarketingContent ||
  mongoose.model("MarketingContent", marketingContentSchema);

export { MarketingContent };
