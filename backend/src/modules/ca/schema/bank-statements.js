import mongoose, { Schema } from "mongoose";

const softDelete = {
  isDeleted: { type: Boolean, default: false, required: true, index: true },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Number, ref: "Users", required: true },
};

const statementSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    accountName: { type: String, required: true, trim: true },
    bankName: { type: String, default: null, trim: true },
    fileName: { type: String, default: null, trim: true },
    periodFrom: { type: Date, default: null },
    periodTo: { type: Date, default: null },
    importedAt: { type: Date, required: true, default: Date.now },
    lineCount: { type: Number, default: 0, min: 0 },
    matchedCount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: null, trim: true },
    ...softDelete,
  },
  { timestamps: true },
);

const lineStatuses = ["unmatched", "matched", "ignored"];
const lineDirections = ["incoming", "outgoing"];

const lineSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    statementId: { type: Number, ref: "CaBankStatements", required: true, index: true },
    date: { type: Date, required: true, index: true },
    description: { type: String, default: "", trim: true },
    reference: { type: String, default: "", trim: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    direction: { type: String, enum: lineDirections, required: true, index: true },
    balance: { type: Number, default: null },
    status: { type: String, enum: lineStatuses, default: "unmatched", required: true, index: true },
    financePaymentId: { type: Number, ref: "FinancePayments", default: null, index: true },
    matchedAt: { type: Date, default: null },
    matchedBy: { type: Number, ref: "Users", default: null },
    suspenseId: { type: Number, ref: "CaSuspenseEntries", default: null, index: true },
    ...softDelete,
  },
  { timestamps: true },
);

lineSchema.index({ statementId: 1, status: 1 });
lineSchema.index({ amount: 1, direction: 1, date: 1 });

function model(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

export const CaBankStatements = model("CaBankStatements", statementSchema);
export const CaBankStatementLines = model("CaBankStatementLines", lineSchema);
export { lineStatuses, lineDirections };
