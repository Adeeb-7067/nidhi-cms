import mongoose, { Schema } from "mongoose";

const companySettingsSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyName: { type: String, default: "My Agency", required: true },
  logoUrl: { type: String },
  address: { type: String },
  sealUrl: { type: String },
}, { timestamps: { createdAt: false, updatedAt: true } });

export const CompanySettings = mongoose.models.CompanySettings || mongoose.model("CompanySettings", companySettingsSchema);

export interface CompanySettings {
  id: number;
  companyName: string;
  logoUrl: string | null;
  address: string | null;
  sealUrl: string | null;
  updatedAt: Date;
}

export const companySettingsTable = CompanySettings;
