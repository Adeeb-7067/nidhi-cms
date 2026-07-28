import mongoose, { Schema } from "mongoose";

const productStatuses = ["active", "inactive"];

const productSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: null },
    price: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 18, min: 0, max: 100 },
    description: { type: String, default: null },
    status: { type: String, enum: productStatuses, default: "active", required: true },
    createdBy: { type: Number, ref: "Users", default: null },
  },
  { timestamps: true }
);

productSchema.index({ name: 1 });

const SalesProducts =
  mongoose.models.SalesProducts || mongoose.model("SalesProducts", productSchema);

export { SalesProducts, productStatuses };
