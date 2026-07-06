import mongoose, { Schema } from "mongoose";

const invoiceStatuses = ["unpaid", "partial", "paid", "overdue", "cancelled"];

const invoiceLineItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String, default: "" },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    number: { type: String, unique: true, required: true },
    title: { type: String, default: null, trim: true },
    customerId: { type: Number, ref: "Clients", required: true, index: true },
    projectId: { type: Number, ref: "Projects", default: null, index: true },
    installmentId: { type: Number, ref: "SalesInstallments", default: null },
    proposalId: { type: Number, ref: "SalesProposals", default: null },
    lineItems: { type: [invoiceLineItemSchema], default: [] },
    notes: { type: String, default: null, trim: true },
    terms: { type: String, default: null, trim: true },
    amount: { type: Number, required: true, min: 0 },
    calculatedAmount: { type: Number, default: null, min: 0 },
    totalAdjustment: { type: Number, default: 0 },
    adjustedTotal: { type: Number, default: null, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: invoiceStatuses, default: "unpaid", required: true, index: true },
    dueDate: { type: Date, required: true },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null, trim: true },
    cancelledBy: { type: Number, ref: "Users", default: null },
  },
  { timestamps: true }
);

invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });

const SalesInvoices =
  mongoose.models.SalesInvoices || mongoose.model("SalesInvoices", invoiceSchema);

export { SalesInvoices, invoiceStatuses };
