import mongoose, { Schema } from "mongoose";

const paymentMethods = ["bank_transfer", "upi", "cheque", "cash", "card"];

const paymentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    invoiceId: { type: Number, ref: "SalesInvoices", required: true, index: true },
    customerId: { type: Number, ref: "SalesCustomers", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, enum: paymentMethods, required: true },
    transactionId: { type: String, trim: true, default: null },
    recordedBy: { type: Number, ref: "Users", required: true },
    receiptNumber: { type: String, unique: true, required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

const SalesPayments =
  mongoose.models.SalesPayments || mongoose.model("SalesPayments", paymentSchema);

export { SalesPayments, paymentMethods };
