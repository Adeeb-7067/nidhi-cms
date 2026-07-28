import mongoose, { Schema } from "mongoose";

const salesPreferencesSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true, default: 1 },
    proposalPrefix: { type: String, default: "PROP", trim: true },
    proposalNextNumber: { type: Number, default: 1, min: 1 },
    defaultTax: { type: Number, default: 18, min: 0, max: 100 },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    reminderHours: { type: Number, default: 24 },
    overdueAlerts: { type: Boolean, default: true },
    documentBranding: {
      gstin: { type: String, trim: true, default: null },
      email: { type: String, trim: true, default: null },
      phone: { type: String, trim: true, default: null },
      pan: { type: String, trim: true, default: null },
      cin: { type: String, trim: true, default: null },
      website: { type: String, trim: true, default: null },
      bankName: { type: String, trim: true, default: null },
      bankAccount: { type: String, trim: true, default: null },
      bankIfsc: { type: String, trim: true, default: null },
      customFields: {
        type: [
          {
            id: { type: String, required: true },
            label: { type: String, trim: true, required: true },
            value: { type: String, trim: true, default: "" },
            showOnInvoice: { type: Boolean, default: true },
            showOnReceipt: { type: Boolean, default: true },
            showOnProposal: { type: Boolean, default: false },
            showOnStatement: { type: Boolean, default: false },
          },
        ],
        default: [],
      },
    },
    updatedBy: { type: Number, ref: "Users" },
  },
  { timestamps: true },
);

const SalesPreferences =
  mongoose.models.SalesPreferences || mongoose.model("SalesPreferences", salesPreferencesSchema);

export { SalesPreferences };
