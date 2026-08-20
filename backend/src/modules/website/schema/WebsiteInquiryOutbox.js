import mongoose from "mongoose";

const WebsiteInquiryOutboxSchema = new mongoose.Schema(
  {
    inquiryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    targetSystem: {
      type: String,
      enum: ["CRM", "HRM", "WEBHOOK"],
      required: true,
      index: true,
    },
    payload: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SENT", "FAILED"],
      default: "PENDING",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

WebsiteInquiryOutboxSchema.index({ status: 1, nextRetryAt: 1 });

export const websiteInquiryOutboxTable =
  mongoose.models.WebsiteInquiryOutbox ||
  mongoose.model("WebsiteInquiryOutbox", WebsiteInquiryOutboxSchema);
