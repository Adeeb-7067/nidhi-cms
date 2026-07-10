import mongoose, { Schema } from "mongoose";

const paymentMethods = ["bank_transfer", "upi", "cheque", "cash", "card"];

const paymentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    invoiceId: { type: Number, ref: "SalesInvoices", required: true, index: true },
    /** Paid invoice for this exact payment amount (installment partials). */
    paymentInvoiceId: { type: Number, ref: "SalesInvoices", default: null, index: true },
    installmentId: { type: Number, ref: "SalesInstallments", default: null, index: true },
    customerId: { type: Number, ref: "Clients", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, enum: paymentMethods, required: true },
    transactionId: { type: String, trim: true, default: null },
    note: { type: String, trim: true, default: null },
    paymentDate: { type: Date, default: Date.now, index: true },
    recordedBy: { type: Number, ref: "Users", required: true },
    receiptNumber: { type: String, unique: true, required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ recordedBy: 1, createdAt: -1 });

const SalesPayments =
  mongoose.models.SalesPayments || mongoose.model("SalesPayments", paymentSchema);

export { SalesPayments, paymentMethods };
