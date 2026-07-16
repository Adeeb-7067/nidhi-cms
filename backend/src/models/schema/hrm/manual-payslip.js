import mongoose, { Schema } from "mongoose";

// Manual payslips are decoupled from the automated, attendance-driven payroll
// chain (PayrollRuns → PayrollLines → PayrollSlips). They let an admin issue a
// one-off payslip for an employee/month by entering a net salary directly. The
// {userId, year, month} unique index makes re-entering a month a "correction"
// (upsert) rather than a duplicate.
const manualPayslipSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, ref: "Users", required: true, index: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  // The single net amount the admin entered for this month.
  net: { type: Number, required: true, min: 0 },
  notes: { type: String, default: "" },
  paidDate: { type: Date, default: null },
  // Pre-rendered payslip HTML (same template as automated payslips) so the
  // existing preview/PDF UI renders it unchanged.
  htmlContent: { type: String },
  createdBy: { type: Number, ref: "Users", required: true },
  updatedBy: { type: Number, ref: "Users" },
}, { timestamps: true });

manualPayslipSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
manualPayslipSchema.index({ year: -1, month: -1 });

const ManualPayslips = mongoose.models.ManualPayslips || mongoose.model("ManualPayslips", manualPayslipSchema);
const manualPayslipsTable = ManualPayslips;

export {
  ManualPayslips,
  manualPayslipsTable,
};
