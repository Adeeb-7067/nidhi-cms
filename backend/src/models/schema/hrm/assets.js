import mongoose, { Schema } from "mongoose";
import { assetCategories, assetConditions, assetStatuses } from "../../../constants/hrm-workflow.js";

const assetSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    tag: { type: String, required: true, trim: true, index: true },
    category: { type: String, enum: assetCategories, required: true, index: true },
    brand: { type: String, required: true, trim: true },
    serial: { type: String, trim: true, default: "" },
    cost: { type: Number, default: 0, min: 0 },
    condition: { type: String, enum: assetConditions, default: "good" },
    status: { type: String, enum: assetStatuses, default: "in_stock", index: true },
    assignedUserId: { type: Number, index: true, default: null },
    assignedOn: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

assetSchema.index({ assignedUserId: 1, status: 1 });

const HrmAssets = mongoose.models.HrmAssets || mongoose.model("HrmAssets", assetSchema);
const hrmAssetsTable = HrmAssets;

export { HrmAssets, hrmAssetsTable };
