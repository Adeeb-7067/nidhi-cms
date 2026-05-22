import mongoose, { Schema } from "mongoose";
const companySettingsSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyName: { type: String, default: "My Agency", required: true },
  logoUrl: { type: String },
  address: { type: String },
  sealUrl: { type: String }
}, { timestamps: { createdAt: false, updatedAt: true } });
const CompanySettings = mongoose.models.CompanySettings || mongoose.model("CompanySettings", companySettingsSchema);
const companySettingsTable = CompanySettings;
export {
  CompanySettings,
  companySettingsTable
};
