import mongoose, { Schema } from "mongoose";
const clientStatuses = ["active", "inactive", "on_hold"];
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
      isPrimary: { type: Boolean, default: false }
    }],
    default: []
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
      uploadedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  tier: { type: String, default: "Standard" },
  status: { type: String, enum: clientStatuses, default: "active", required: true },
  portalLogin: { type: Boolean, default: false, required: true },
  userId: { type: Number, ref: "Users", index: true },
  createdBy: { type: Number, ref: "Users", index: true },
  clientSince: { type: Date, default: Date.now, required: true }
}, { timestamps: true });
const Clients = mongoose.models.Clients || mongoose.model("Clients", clientSchema);
const clientsTable = Clients;
const companiesTable = Clients;
export {
  Clients,
  clientStatuses,
  clientsTable,
  companiesTable
};
