import mongoose, { Schema } from "mongoose";
import {
  MARKETING_TASK_STATUSES,
  MARKETING_TASK_PRIORITIES,
  MARKETING_TASK_CATEGORIES,
} from "../../../constants/marketing.js";

const marketingTaskSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountId: { type: Number, ref: "MarketingAccounts", required: true, index: true },
    companyId: { type: Number, ref: "Clients", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: MARKETING_TASK_CATEGORIES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: MARKETING_TASK_STATUSES,
      default: "not_started",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: MARKETING_TASK_PRIORITIES,
      default: "medium",
      required: true,
      index: true,
    },
    assigneeId: { type: Number, ref: "Users", default: null, index: true },
    deadline: { type: Date, default: null, index: true },
    estimatedHours: { type: Number, default: 0, min: 0 },
    description: { type: String, default: null, trim: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

marketingTaskSchema.index({ accountId: 1, status: 1, deadline: 1 });
marketingTaskSchema.index({ assigneeId: 1, status: 1 });

const MarketingTasks =
  mongoose.models.MarketingTasks || mongoose.model("MarketingTasks", marketingTaskSchema);

export { MarketingTasks };
