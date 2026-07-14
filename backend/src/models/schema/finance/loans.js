import mongoose, { Schema } from "mongoose";

const loanStatuses = ["active", "closed"];

const loanSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    reference: { type: String, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    lender: { type: String, required: true, trim: true },
    principal: { type: Number, required: true, min: 0.01 },
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

const FinanceLoans = mongoose.models.FinanceLoans || mongoose.model("FinanceLoans", loanSchema);

export { FinanceLoans, loanStatuses };
