import mongoose, { Schema } from "mongoose";

const engagementStatuses = ["active", "completed", "cancelled"];
const engagementPaymentModes = ["lump_sum", "installments"];
const installmentStatuses = ["pending", "paid", "cancelled"];

const freelancerEngagementSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    projectId: { type: Number, ref: "Projects", required: true, index: true },
    userId: { type: Number, ref: "Users", required: true, index: true },
    /** Total agreed fee for this project engagement (INR). */
    agreedAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", required: true },
    paymentMode: {
      type: String,
      enum: engagementPaymentModes,
      default: "lump_sum",
      required: true,
    },
    status: {
      type: String,
      enum: engagementStatuses,
      default: "active",
      required: true,
      index: true,
    },
    notes: { type: String, default: null, trim: true },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

freelancerEngagementSchema.index({ projectId: 1, userId: 1 }, { unique: true });
freelancerEngagementSchema.index({ userId: 1, status: 1 });

const freelancerInstallmentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    engagementId: {
      type: Number,
      ref: "FreelancerEngagements",
      required: true,
      index: true,
    },
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: installmentStatuses,
      default: "pending",
      required: true,
      index: true,
    },
    paidAt: { type: Date, default: null },
    paymentMode: { type: String, default: null, trim: true },
    /** Bank/UTR/cheque reference (mirrors sales transactionId). */
    reference: { type: String, default: null, trim: true },
    /** Official voucher number from FinancePayments (e.g. FIN-REC-2026-0001). */
    receiptNumber: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
    proofImageUrl: { type: String, default: null, trim: true },
    recordedBy: { type: Number, ref: "Users", default: null },
    expenseId: { type: Number, ref: "FinanceExpenses", default: null },
    paymentId: { type: Number, ref: "FinancePayments", default: null },
  },
  { timestamps: true },
);

freelancerInstallmentSchema.index({ engagementId: 1, status: 1 });

const FreelancerEngagements =
  mongoose.models.FreelancerEngagements ||
  mongoose.model("FreelancerEngagements", freelancerEngagementSchema);

const FreelancerInstallments =
  mongoose.models.FreelancerInstallments ||
  mongoose.model("FreelancerInstallments", freelancerInstallmentSchema);

export {
  FreelancerEngagements,
  FreelancerInstallments,
  engagementStatuses,
  engagementPaymentModes,
  installmentStatuses,
};
