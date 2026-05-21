import mongoose, { Schema } from "mongoose";

export const clientStatuses = ["active", "inactive", "on_hold"] as const;
export type ClientStatus = typeof clientStatuses[number];

const clientSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyName: { type: String, required: true },
  companyCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  contactPerson: { type: String, required: true },
  primaryContact: { type: String },
  contacts: {
    type: [{
      name: { type: String, required: true },
      email: { type: String, lowercase: true },
      phone: { type: String },
      designation: { type: String },
      isPrimary: { type: Boolean, default: false },
    }],
    default: [],
  },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  address: { type: String },
  gstNumber: { type: String },
  logoUrl: { type: String },
  logo: { type: String },
  industry: { type: String },
  website: { type: String },
  documents: {
    type: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      category: { type: String },
      uploadedBy: { type: Number, ref: "Users" },
      uploadedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
  tier: { type: String, default: "Standard" },
  status: { type: String, enum: clientStatuses, default: "active", required: true },
  portalLogin: { type: Boolean, default: false, required: true },
  userId: { type: Number, ref: "Users", index: true },
  createdBy: { type: Number, ref: "Users", index: true },
  clientSince: { type: Date, default: Date.now, required: true },
}, { timestamps: true });

export const Clients = mongoose.models.Clients || mongoose.model("Clients", clientSchema);

export interface Client {
  id: number;
  companyName: string;
  companyCode: string | null;
  contactPerson: string;
  primaryContact: string | null;
  contacts: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    designation?: string | null;
    isPrimary?: boolean;
  }>;
  email: string;
  phone: string | null;
  address: string | null;
  gstNumber: string | null;
  logoUrl: string | null;
  logo: string | null;
  industry: string | null;
  website: string | null;
  documents: Array<{
    name: string;
    url: string;
    category?: string | null;
    uploadedBy?: number | null;
    uploadedAt?: Date;
  }>;
  tier: string;
  status: ClientStatus;
  portalLogin: boolean;
  userId: number | null;
  createdBy: number | null;
  clientSince: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const clientsTable = Clients;
export const companiesTable = Clients;
