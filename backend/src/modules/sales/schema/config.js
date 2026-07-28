import mongoose, { Schema } from "mongoose";

const salesConfigTypes = ["lead_source", "lead_channel"];

const salesConfigSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    type: { type: String, enum: salesConfigTypes, required: true, index: true },
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    createdBy: { type: Number, ref: "Users", index: true },
  },
  { timestamps: true }
);

salesConfigSchema.index({ type: 1, value: 1 }, { unique: true });

const SalesConfig = mongoose.models.SalesConfig || mongoose.model("SalesConfig", salesConfigSchema);

export { SalesConfig, salesConfigTypes };
