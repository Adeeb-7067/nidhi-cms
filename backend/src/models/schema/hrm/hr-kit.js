import mongoose, { Schema } from "mongoose";

const hrmHrKitSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: "General" },
  fileUrl: { type: String },
  version: { type: String, default: "1.0" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const HrmHrKits = mongoose.models.HrmHrKits || mongoose.model("HrmHrKits", hrmHrKitSchema);
const hrmHrKitsTable = HrmHrKits;

export { HrmHrKits, hrmHrKitsTable };
