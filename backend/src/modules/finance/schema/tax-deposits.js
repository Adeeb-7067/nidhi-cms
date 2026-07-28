import mongoose, { Schema } from "mongoose";

const taxDepositTypes = ["gst", "tds"];

const taxDepositSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    type: { type: String, enum: taxDepositTypes, required: true, index: true },
    /** e.g. "2026-06" (monthly) or "2026-Q1" (quarterly) — matches the tax summary period key. */
    period: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    challanNumber: { type: String, default: null, trim: true },
    depositedAt: { type: Date, required: true },
    depositedBy: { type: Number, ref: "Users", required: true },
    paymentId: { type: Number, ref: "FinancePayments", default: null },
    expenseId: { type: Number, ref: "FinanceExpenses", default: null },
  },
  { timestamps: true },
);

taxDepositSchema.index({ type: 1, period: 1 });

const FinanceTaxDeposits =
  mongoose.models.FinanceTaxDeposits || mongoose.model("FinanceTaxDeposits", taxDepositSchema);

export { FinanceTaxDeposits, taxDepositTypes };
