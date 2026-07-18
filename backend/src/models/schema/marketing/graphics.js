import mongoose, { Schema } from "mongoose";
import {
  MARKETING_APPROVAL_STAGES,
  MARKETING_GRAPHIC_FILE_TYPES,
} from "../../../constants/marketing.js";

const marketingGraphicSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: MARKETING_APPROVAL_STAGES,
      default: "internal_review",
      required: true,
      index: true,
    },
    revisionCount: { type: Number, default: 0, min: 0 },
    brandGuidelineUrl: { type: String, default: null },
    fileTypes: {
      type: [{ type: String, enum: MARKETING_GRAPHIC_FILE_TYPES }],
      default: [],
    },
    assigneeId: { type: Number, ref: "Users", default: null, index: true },
    dueDate: { type: Date, default: null, index: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const MarketingGraphics =
  mongoose.models.MarketingGraphics ||
  mongoose.model("MarketingGraphics", marketingGraphicSchema);

export { MarketingGraphics };
