import mongoose, { Schema } from "mongoose";
import { financePaymentModes } from "./expenses.js";

const paymentDirections = ["incoming", "outgoing"];
const paymentStatuses = ["completed", "pending", "failed"];
const partyTypes = ["client", "vendor", "employee", "other"];

const paymentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    mode: { type: String, enum: financePaymentModes, required: true },
    direction: { type: String, enum: paymentDirections, required: true, index: true },
    /** User/bank-supplied transaction reference (e.g. a NEFT UTR) — not guaranteed unique. */
    reference: { type: String, required: true, trim: true },
    /** Internal system receipt number, e.g. FIN-REC-2026-0001 — always unique. */
    receiptNumber: { type: String, unique: true, required: true },
    status: { type: String, enum: paymentStatuses, default: "completed", required: true },
    partyType: { type: String, enum: partyTypes, default: "other", required: true },
    partyName: { type: String, required: true, trim: true },
    clientId: { type: Number, ref: "Clients", default: null, index: true },
    vendorId: { type: Number, ref: "Clients", default: null, index: true },
    employeeId: { type: Number, ref: "Users", default: null, index: true },
    invoiceId: { type: Number, ref: "FinanceInvoices", default: null, index: true },
    incomeId: { type: Number, ref: "FinanceIncome", default: null, index: true },
    expenseId: { type: Number, ref: "FinanceExpenses", default: null, index: true },
    bankAccountId: { type: Number, ref: "FinanceBankAccounts", default: null, index: true },
    recordedBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ direction: 1, createdAt: -1 });

const FinancePayments =
  mongoose.models.FinancePayments || mongoose.model("FinancePayments", paymentSchema);

export { FinancePayments, paymentDirections, paymentStatuses, partyTypes };
