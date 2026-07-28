import mongoose, { Schema } from "mongoose";

const budgetTypes = ["annual", "project"];
/** Stored only as a display hint set at create time; the authoritative status is
 * always recomputed live from spend, see services/finance/finance-totals.js. */
const budgetStatuses = ["on_track", "warning", "exceeded"];

const budgetSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: budgetTypes, required: true, index: true },
    projectId: { type: Number, ref: "Projects", default: null, index: true },
    fiscalYear: { type: String, required: true, index: true },
    allocated: { type: Number, required: true, min: 0 },
    department: { type: String, default: null, trim: true },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

budgetSchema.index({ fiscalYear: 1, type: 1 });

const FinanceBudgets = mongoose.models.FinanceBudgets || mongoose.model("FinanceBudgets", budgetSchema);

export { FinanceBudgets, budgetTypes, budgetStatuses };
