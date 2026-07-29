import mongoose, { Schema } from "mongoose";

const expenseCategories = [
  "software",
  "hardware",
  "travel",
  "office",
  "marketing",
  "utilities",
  "professional",
  "loan",
  "security_deposit",
  "misc",
];
const expenseStatuses = ["pending", "approved", "rejected"];
/** Cash settlement of an approved bill — independent of approval status. */
const expensePaymentStatuses = ["unpaid", "partially_paid", "paid"];
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
    vendorId: { type: Number, ref: "Vendors", default: null, index: true },
    /** When set, this expense counts as a repayment toward that loan (on approve). */
    loanId: { type: Number, ref: "FinanceLoans", default: null, index: true },
    /**
     * How an installment payment splits against the loan (reducing-balance bookkeeping).
     * Default "both" = interest first, then principal (standard EMI).
     */
    loanAllocation: {
      type: String,
      enum: ["both", "interest", "principal"],
      default: "both",
    },
    /** When set, this expense is a payment for a software subscription. */
    subscriptionId: { type: Number, ref: "FinanceSubscriptions", default: null, index: true },
    /** When set, this expense was created from an issued bank cheque. */
    chequeId: { type: Number, ref: "FinanceCheques", default: null, index: true },
    /** Optional client payee (e.g. security deposit / client refund cheque). */
    clientId: { type: Number, ref: "Clients", default: null, index: true },
    /** When set, this expense settles a vendor purchase bill (GST stays on the bill). */
    vendorInvoiceId: { type: Number, ref: "FinanceVendorInvoices", default: null, index: true },
    /** When set, this expense is a freelancer engagement installment payout. */
    freelancerInstallmentId: {
      type: Number,
      ref: "FreelancerInstallments",
      default: null,
      index: true,
    },
    taxDepositId: { type: Number, ref: "FinanceTaxDeposits", default: null, index: true },
    payrollRunId: { type: Number, ref: "PayrollRuns", default: null, index: true },
    /** When set, approved spend counts toward this budget (see budgets.controller computeSpentForBudget). */
    budgetId: { type: Number, ref: "FinanceBudgets", default: null, index: true },
    notes: { type: String, default: null, trim: true },
    status: { type: String, enum: expenseStatuses, default: "pending", required: true, index: true },
    /**
     * Cash settled against this bill. Only set after approval (or auto-approve paths).
     * Omit on legacy docs so aggregations treat them as fully paid.
     */
    paidAmount: { type: Number, min: 0 },
    paymentStatus: { type: String, enum: expensePaymentStatuses, index: true },
    gstEnabled: { type: Boolean, default: false, required: true },
    gstAmount: { type: Number, default: 0, min: 0 },
    attachments: { type: [attachmentSchema], default: [] },
    approvedBy: { type: Number, ref: "Users", default: null },
    approvedAt: { type: Date, default: null },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

expenseSchema.index({ status: 1, date: -1 });
expenseSchema.index({ createdAt: -1 });

const FinanceExpenses =
  mongoose.models.FinanceExpenses || mongoose.model("FinanceExpenses", expenseSchema);

export {
  FinanceExpenses,
  expenseCategories,
  expenseStatuses,
  expensePaymentStatuses,
  financePaymentModes,
};
