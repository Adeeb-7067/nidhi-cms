import mongoose, { Schema } from "mongoose";
import { LEGAL_COUNSEL_ROLES } from "../../../constants/legal.js";

const softDelete = {
  isDeleted: { type: Boolean, default: false, required: true, index: true },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Number, ref: "Users", required: true },
};

const counselSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: LEGAL_COUNSEL_ROLES, required: true, index: true },
    ...softDelete,
  },
  { timestamps: true },
);

counselSchema.index({ email: 1, isDeleted: 1 });

function model(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

export const LegalCounsel = model("LegalCounsel", counselSchema);
