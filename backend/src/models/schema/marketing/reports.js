import mongoose, { Schema } from "mongoose";
import { MARKETING_REPORT_PERIODS } from "../../../constants/marketing.js";

const marketingReportSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", default: null, index: true },
    companyId: { type: Number, ref: "Clients", default: null, index: true },
    title: { type: String, required: true, trim: true },
    period: { type: String, enum: MARKETING_REPORT_PERIODS, required: true },
    generatedAt: { type: Date, default: Date.now, required: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
  },
  { timestamps: true },
);

const MarketingReports =
  mongoose.models.MarketingReports ||
  mongoose.model("MarketingReports", marketingReportSchema);

export { MarketingReports };
