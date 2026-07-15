import mongoose, { Schema } from "mongoose";

const chequePayeeTypes = ["vendor", "client", "employee"];
const chequePurposes = ["normal", "security_deposit"];
const chequeStatuses = ["issued", "cleared", "cancelled", "bounced"];

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

const chequeSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    reference: { type: String, unique: true, required: true },
    payeeType: { type: String, enum: chequePayeeTypes, required: true, index: true },
    vendorId: { type: Number, ref: "Vendors", default: null, index: true },
    clientId: { type: Number, ref: "Clients", default: null, index: true },
    employeeId: { type: Number, ref: "Users", default: null, index: true },
    payeeName: { type: String, required: true, trim: true },
    purpose: { type: String, enum: chequePurposes, default: "normal", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    chequeNumber: { type: String, required: true, trim: true },
    issueDate: { type: Date, required: true, index: true },
    clearanceDate: { type: Date, required: true, index: true },
    bankName: { type: String, default: null, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    status: { type: String, enum: chequeStatuses, default: "issued", required: true, index: true },
    expenseId: { type: Number, ref: "FinanceExpenses", required: true, index: true },
    clearedAt: { type: Date, default: null },
    clearedBy: { type: Number, ref: "Users", default: null },
    notes: { type: String, default: null, trim: true },
    reminderStartedAt: { type: Date, default: null },
    lastReminderAt: { type: Date, default: null },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

chequeSchema.index({ status: 1, clearanceDate: 1 });
chequeSchema.index({ createdAt: -1 });
chequeSchema.index({ chequeNumber: 1 });

const FinanceCheques =
  mongoose.models.FinanceCheques || mongoose.model("FinanceCheques", chequeSchema);

export {
  FinanceCheques,
  chequePayeeTypes,
  chequePurposes,
  chequeStatuses,
};
