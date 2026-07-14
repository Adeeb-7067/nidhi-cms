import mongoose, { Schema } from "mongoose";

const vendorStatuses = ["active", "inactive"];

/**
 * Vendors (payees / suppliers) live in their own collection, fully separate
 * from Clients. Field names mirror the legacy Clients-based vendor shape
 * (companyName, gstNumber, vendorFields, vendorNotes) so existing DTO/mapper
 * helpers keep working unchanged.
 */
const vendorSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: null, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true },
    website: { type: String, default: null, trim: true },
    gstNumber: { type: String, default: null, trim: true },
    /** Free-form service/provider details (e.g. Service → AWS hosting). */
    vendorFields: {
      type: [
        {
          label: { type: String, trim: true, required: true },
          value: { type: String, trim: true, default: "" },
        },
      ],
      default: [],
    },
    vendorNotes: { type: String, default: null, trim: true },
    /** @deprecated use vendorFields — kept for legacy migrated rows */
    vendorCategory: { type: String, default: null, trim: true },
    status: { type: String, enum: vendorStatuses, default: "active", required: true, index: true },
    createdBy: { type: Number, ref: "Users", index: true },
  },
  { timestamps: true },
);

vendorSchema.index({ companyName: 1 });
vendorSchema.index({ createdAt: -1 });

const Vendors = mongoose.models.Vendors || mongoose.model("Vendors", vendorSchema);
const vendorsTable = Vendors;

export { Vendors, vendorsTable, vendorStatuses };
