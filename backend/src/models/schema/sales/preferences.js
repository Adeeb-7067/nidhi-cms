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
    updatedBy: { type: Number, ref: "Users" },
  },
  { timestamps: true },
);

const SalesPreferences =
  mongoose.models.SalesPreferences || mongoose.model("SalesPreferences", salesPreferencesSchema);

export { SalesPreferences };
