import mongoose, { Schema } from "mongoose";
import {
  MARKETING_VIDEO_EXPORT_TARGETS,
  MARKETING_VIDEO_RENDER_STATUSES,
} from "../../../constants/marketing.js";

const marketingVideoSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    title: { type: String, required: true, trim: true },
    renderStatus: {
      type: String,
      enum: MARKETING_VIDEO_RENDER_STATUSES,
      default: "raw_uploaded",
      required: true,
      index: true,
    },
    hasVoiceover: { type: Boolean, default: false },
    hasSubtitles: { type: Boolean, default: false },
    hasThumbnail: { type: Boolean, default: false },
    exportTarget: {
      type: String,
      enum: MARKETING_VIDEO_EXPORT_TARGETS,
      default: "reel",
      required: true,
    },
    assigneeId: { type: Number, ref: "Users", default: null, index: true },
    dueDate: { type: Date, default: null, index: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const MarketingVideos =
  mongoose.models.MarketingVideos || mongoose.model("MarketingVideos", marketingVideoSchema);

export { MarketingVideos };
