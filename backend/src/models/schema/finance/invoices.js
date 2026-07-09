import mongoose, { Schema } from "mongoose";

const invoiceStatuses = ["unpaid", "partially_paid", "paid", "overdue", "cancelled"];

const invoiceLineItemSchema = new Schema(
  {
    id: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    rate: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false },
);

const creditNoteSchema = new Schema(
  {
    id: { type: String, required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    number: { type: String, unique: true, required: true },
    clientId: { type: Number, ref: "Clients", required: true, index: true },
    projectId: { type: Number, ref: "Projects", default: null, index: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: invoiceStatuses, default: "unpaid", required: true, index: true },
    items: { type: [invoiceLineItemSchema], default: [] },
    discount: { type: Number, default: 0, min: 0 },
    gstEnabled: { type: Boolean, default: true, required: true },
    paidAmount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: null, trim: true },
    creditNotes: { type: [creditNoteSchema], default: [] },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null, trim: true },
    cancelledBy: { type: Number, ref: "Users", default: null },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ clientId: 1, createdAt: -1 });

const FinanceInvoices =
  mongoose.models.FinanceInvoices || mongoose.model("FinanceInvoices", invoiceSchema);

export { FinanceInvoices, invoiceStatuses };
