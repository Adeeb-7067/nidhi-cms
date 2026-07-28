import mongoose, { Schema } from "mongoose";

const vendorInvoiceStatuses = ["unpaid", "paid", "cancelled"];

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

const vendorInvoiceSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    vendorId: { type: Number, ref: "Vendors", required: true, index: true },
    /** Vendor's bill / tax invoice number */
    invoiceNumber: { type: String, required: true, trim: true },
    invoiceDate: { type: Date, required: true, index: true },
    taxableAmount: { type: Number, required: true, min: 0 },
    gstEnabled: { type: Boolean, default: true, required: true },
    gstRate: { type: Number, default: 18, min: 0, max: 100 },
    gstAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: vendorInvoiceStatuses,
      default: "unpaid",
      required: true,
      index: true,
    },
    /** Cash settled against this bill (may be partial). */
    paidAmount: { type: Number, default: 0, min: 0 },
    /** Last / primary finance payment that settled this bill. */
    paymentId: { type: Number, ref: "FinancePayments", default: null },
    notes: { type: String, default: null, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

vendorInvoiceSchema.index({ vendorId: 1, invoiceDate: -1 });
vendorInvoiceSchema.index({ createdAt: -1 });

const FinanceVendorInvoices =
  mongoose.models.FinanceVendorInvoices ||
  mongoose.model("FinanceVendorInvoices", vendorInvoiceSchema);

export { FinanceVendorInvoices, vendorInvoiceStatuses };
