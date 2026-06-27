import mongoose, { Schema } from "mongoose";

const installmentStatuses = ["pending", "partial", "paid", "overdue"];

const installmentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    projectId: { type: Number, ref: "Projects", required: true, index: true },
    customerId: { type: Number, ref: "SalesCustomers", required: true, index: true },
    name: { type: String, required: true, trim: true },
    dueAmount: { type: Number, required: true, min: 0 },
    calculatedAmount: { type: Number, default: null, min: 0 },
    totalAdjustment: { type: Number, default: 0 },
    adjustedTotal: { type: Number, default: null, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: installmentStatuses, default: "pending", required: true, index: true },
    invoiceId: { type: Number, ref: "SalesInvoices", default: null },
  },
  { timestamps: true }
);

installmentSchema.index({ dueDate: 1, status: 1 });

const SalesInstallments =
  mongoose.models.SalesInstallments || mongoose.model("SalesInstallments", installmentSchema);

export { SalesInstallments, installmentStatuses };
