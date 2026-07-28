import mongoose, { Schema } from "mongoose";
import { documentStatuses } from "../../../constants/hrm.js";

const employeeDocumentSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, default: "general" },
  fileUrl: { type: String, required: true },
  status: { type: String, enum: documentStatuses, default: "pending", index: true },
  reviewedBy: { type: Number },
  reviewNote: { type: String },
}, { timestamps: true });

employeeDocumentSchema.index({ userId: 1, createdAt: -1 });

const EmployeeDocuments = mongoose.models.EmployeeDocuments || mongoose.model("EmployeeDocuments", employeeDocumentSchema);
const employeeDocumentsTable = EmployeeDocuments;

export { EmployeeDocuments, employeeDocumentsTable };
