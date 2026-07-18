import mongoose, { Schema } from "mongoose";
import { MARKETING_MEDIA_KINDS } from "../../../constants/marketing.js";

/**
 * Per-account file vault (PC-style tree).
 * Root folder: parentId = null for that accountId.
 */
const marketingMediaSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    parentId: { type: Number, ref: "MarketingMediaItems", default: null, index: true },
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: MARKETING_MEDIA_KINDS,
      required: true,
      index: true,
    },
    extension: { type: String, default: null, trim: true },
    sizeBytes: { type: Number, default: null, min: 0 },
    url: { type: String, default: null },
    storageKey: { type: String, default: null },
    mimetype: { type: String, default: null },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

marketingMediaSchema.index({ accountId: 1, parentId: 1, isDeleted: 1 });
marketingMediaSchema.index({ accountId: 1, name: 1 });

const MarketingMediaItems =
  mongoose.models.MarketingMediaItems ||
  mongoose.model("MarketingMediaItems", marketingMediaSchema);

export { MarketingMediaItems };
