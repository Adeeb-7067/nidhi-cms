import mongoose, { Schema } from "mongoose";
import { MARKETING_ACTIVITY_TYPES } from "../../../constants/marketing.js";

const marketingActivitySchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", default: null, index: true },
    companyId: { type: Number, ref: "Clients", default: null, index: true },
    message: { type: String, required: true, trim: true },
    actorId: { type: Number, ref: "Users", required: true, index: true },
    type: {
      type: String,
      enum: MARKETING_ACTIVITY_TYPES,
      required: true,
      index: true,
    },
    entityType: { type: String, default: null },
    entityId: { type: Number, default: null },
  },
  { timestamps: true },
);

marketingActivitySchema.index({ createdAt: -1 });

const MarketingActivity =
  mongoose.models.MarketingActivity ||
  mongoose.model("MarketingActivity", marketingActivitySchema);

export { MarketingActivity };
