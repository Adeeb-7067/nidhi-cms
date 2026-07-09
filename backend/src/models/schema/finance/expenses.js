import mongoose, { Schema } from "mongoose";

const expenseCategories = [
  "software",
  "hardware",
  "travel",
  "office",
  "marketing",
  "utilities",
  "professional",
  "misc",
];
const expenseStatuses = ["pending", "approved", "rejected"];
const financePaymentModes = ["bank_transfer", "upi", "cash", "cheque", "card", "neft"];

const attachmentSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    key: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    uploadedBy: { type: Number, ref: "Users" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const expenseSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    reference: { type: String, unique: true, required: true },
    date: { type: Date, required: true },
    category: { type: String, enum: expenseCategories, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: financePaymentModes, required: true },
    projectId: { type: Number, ref: "Projects", default: null, index: true },
    employeeId: { type: Number, ref: "Users", default: null, index: true },
    vendorId: { type: Number, ref: "Clients", default: null, index: true },
    notes: { type: String, default: null, trim: true },
    status: { type: String, enum: expenseStatuses, default: "pending", required: true, index: true },
    gstEnabled: { type: Boolean, default: false, required: true },
    gstAmount: { type: Number, default: 0, min: 0 },
    attachments: { type: [attachmentSchema], default: [] },
    approvedBy: { type: Number, ref: "Users", default: null },
    approvedAt: { type: Date, default: null },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ status: 1, date: -1 });
expenseSchema.index({ createdAt: -1 });

const FinanceExpenses =
  mongoose.models.FinanceExpenses || mongoose.model("FinanceExpenses", expenseSchema);

export { FinanceExpenses, expenseCategories, expenseStatuses, financePaymentModes };
