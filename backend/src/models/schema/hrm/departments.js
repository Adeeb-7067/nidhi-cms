import mongoose, { Schema } from "mongoose";
import { departmentStatuses } from "../../../constants/hrm.js";

const departmentSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String },
  headUserId: { type: Number, ref: "Users", index: true },
  parentDepartmentId: { type: Number, ref: "Departments", index: true },
  status: { type: String, enum: departmentStatuses, default: "active", required: true },
}, { timestamps: true });

departmentSchema.index({ status: 1, name: 1 });

const Departments = mongoose.models.Departments || mongoose.model("Departments", departmentSchema);
const departmentsTable = Departments;

export { Departments, departmentsTable };
