import mongoose, { Schema } from "mongoose";

const invoiceStatuses = ["unpaid", "partial", "paid", "overdue"];

const invoiceSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    number: { type: String, unique: true, required: true },
    customerId: { type: Number, ref: "SalesCustomers", required: true, index: true },
    projectId: { type: Number, ref: "Projects", default: null, index: true },
    installmentId: { type: Number, ref: "SalesInstallments", default: null },
    proposalId: { type: Number, ref: "SalesProposals", default: null },
    amount: { type: Number, required: true, min: 0 },
    calculatedAmount: { type: Number, default: null, min: 0 },
    totalAdjustment: { type: Number, default: 0 },
    adjustedTotal: { type: Number, default: null, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: invoiceStatuses, default: "unpaid", required: true, index: true },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });

const SalesInvoices =
  mongoose.models.SalesInvoices || mongoose.model("SalesInvoices", invoiceSchema);

export { SalesInvoices, invoiceStatuses };
