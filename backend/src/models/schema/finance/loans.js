import mongoose, { Schema } from "mongoose";

const loanStatuses = ["active", "closed"];
const loanSources = ["bank", "market"];

const loanSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    reference: { type: String, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    lender: { type: String, required: true, trim: true },
    /** Whether the loan is from a bank or from the market (informal / private). */
    source: { type: String, enum: loanSources, default: "bank", required: true, index: true },
    principal: { type: Number, required: true, min: 0.01 },
    /** Interest rate as % per month (reducing balance). */
    interestRate: { type: Number, default: null, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    tenureMonths: { type: Number, default: null, min: 1 },
    emiAmount: { type: Number, default: null, min: 0 },
    status: { type: String, enum: loanStatuses, default: "active", required: true, index: true },
    notes: { type: String, default: null, trim: true },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

loanSchema.index({ status: 1, createdAt: -1 });
loanSchema.index({ name: 1 });
loanSchema.index({ source: 1, status: 1 });

const FinanceLoans = mongoose.models.FinanceLoans || mongoose.model("FinanceLoans", loanSchema);

export { FinanceLoans, loanStatuses, loanSources };
