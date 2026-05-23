import mongoose, { Schema } from "mongoose";
const companySettingsSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyName: { type: String, default: "My Agency", required: true },
  logoUrl: { type: String },
  address: { type: String },
  sealUrl: { type: String },
  requiredDailyWorkHours: { type: Number, default: 7.5, min: 1, max: 16 },
  dailyLogComplianceEnabled: { type: Boolean, default: true }
}, { timestamps: { createdAt: false, updatedAt: true } });
const CompanySettings = mongoose.models.CompanySettings || mongoose.model("CompanySettings", companySettingsSchema);
const companySettingsTable = CompanySettings;
export {
  CompanySettings,
  companySettingsTable
};
