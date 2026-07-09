import mongoose, { Schema } from "mongoose";

const bankAccountSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    bankName: { type: String, default: null, trim: true },
    accountNumberMasked: { type: String, default: null, trim: true },
    ifsc: { type: String, default: null, trim: true },
    openingBalance: { type: Number, default: 0 },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

const FinanceBankAccounts =
  mongoose.models.FinanceBankAccounts || mongoose.model("FinanceBankAccounts", bankAccountSchema);

export { FinanceBankAccounts };
