import mongoose, { Schema } from "mongoose";
import { CA_TASK_PRIORITIES, CA_TASK_STATUSES } from "../../../constants/ca.js";

const caTaskSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: CA_TASK_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: CA_TASK_PRIORITIES,
      default: "medium",
      required: true,
      index: true,
    },
    assignedById: { type: Number, ref: "Users", default: null, index: true },
    assignedToId: { type: Number, ref: "Users", default: null, index: true },
    assignedByName: { type: String, default: null, trim: true },
    assignedToName: { type: String, default: null, trim: true },
    dueDate: { type: Date, default: null, index: true },
    description: { type: String, default: null, trim: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

caTaskSchema.index({ status: 1, dueDate: 1 });

const CaTasks = mongoose.models.CaTasks || mongoose.model("CaTasks", caTaskSchema);

export { CaTasks };
