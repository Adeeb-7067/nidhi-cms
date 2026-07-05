import mongoose, { Schema } from "mongoose";

const clientStatuses = ["active", "inactive", "on_hold", "prospect", "lost"];
const customerTypes = ["corporate", "sme", "individual"];

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
  /** Sales CRM classification (corporate / sme / individual). */
  customerType: { type: String, enum: customerTypes, default: "corporate", required: true },
  /** Originating sales lead when converted from CRM. */
  leadId: { type: Number, ref: "SalesLeads", default: null, index: true },
  /** Internal staff admin assigned to manage this account in sales. */
  assignedAdminId: { type: Number, ref: "Users", default: null, index: true },
  portalLogin: { type: Boolean, default: false, required: true },
  userId: { type: Number, ref: "Users", index: true },
  /** Direct 1:1 staff↔client discussion channel created at portal onboarding. */
  directConversationId: { type: Number, default: null, index: true },
  createdBy: { type: Number, ref: "Users", index: true },
  clientSince: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

clientSchema.index({ createdAt: -1 });

const Clients = mongoose.models.Clients || mongoose.model("Clients", clientSchema);
const clientsTable = Clients;
const companiesTable = Clients;

export {
  Clients,
  clientStatuses,
  customerTypes,
  clientsTable,
  companiesTable,
};
