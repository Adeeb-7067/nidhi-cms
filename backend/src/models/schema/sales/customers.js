import mongoose, { Schema } from "mongoose";

const customerStatuses = ["active", "inactive", "prospect", "lost"];
const customerTypes = ["corporate", "sme", "individual"];

const customerSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: null },
    status: { type: String, enum: customerStatuses, default: "active", required: true, index: true },
    type: { type: String, enum: customerTypes, default: "corporate", required: true },
    location: { type: String, trim: true, default: null },
    gstin: { type: String, trim: true, default: null },
    website: { type: String, trim: true, default: null },
    leadId: { type: Number, ref: "SalesLeads", default: null, index: true },
    clientId: { type: Number, ref: "Clients", default: null, index: true },
    portalUserId: { type: Number, ref: "Users", default: null, index: true },
  },
  { timestamps: true }
);

customerSchema.index({ createdAt: -1 });

const SalesCustomers =
  mongoose.models.SalesCustomers || mongoose.model("SalesCustomers", customerSchema);

export { SalesCustomers, customerStatuses, customerTypes };
