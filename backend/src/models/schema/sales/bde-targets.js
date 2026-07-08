import mongoose, { Schema } from "mongoose";

const bdeTargetSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    userId: { type: Number, ref: "Users", required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    /**
     * Closed project value target (₹). Progress = sum of installment schedules
     * created this month for deals this BDE closed. null = not tracked.
     */
    revenueTarget: { type: Number, default: null },
    dealsTarget: { type: Number, default: null },
    leadsTarget: { type: Number, default: null },
    setBy: { type: Number, ref: "Users", required: true },
    notes: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

bdeTargetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

const SalesBdeTargets =
  mongoose.models.SalesBdeTargets || mongoose.model("SalesBdeTargets", bdeTargetSchema);

export { SalesBdeTargets };
