import mongoose, { Schema } from "mongoose";
import { financePaymentModes } from "./expenses.js";

const incomeStatuses = ["received", "pending", "partial"];

const incomeSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    reference: { type: String, unique: true, required: true },
    date: { type: Date, required: true },
    clientId: { type: Number, ref: "Clients", required: true, index: true },
    projectId: { type: Number, ref: "Projects", default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: financePaymentModes, required: true },
    status: { type: String, enum: incomeStatuses, default: "received", required: true, index: true },
    invoiceId: { type: Number, ref: "FinanceInvoices", default: null, index: true },
    recordedBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

incomeSchema.index({ date: -1 });
incomeSchema.index({ clientId: 1, date: -1 });

const FinanceIncome = mongoose.models.FinanceIncome || mongoose.model("FinanceIncome", incomeSchema);

export { FinanceIncome, incomeStatuses };
