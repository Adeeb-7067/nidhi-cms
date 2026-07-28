import mongoose, { Schema } from "mongoose";
import { payrollRunStatuses } from "../../../constants/hrm.js";

const salaryStructureSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, unique: true, index: true },
  basic: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  pfEmployee: { type: Number, default: 0 },
  pfEmployer: { type: Number, default: 0 },
  esiEmployee: { type: Number, default: 0 },
  esiEmployer: { type: Number, default: 0 },
  tds: { type: Number, default: 0 },
  gross: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  effectiveFrom: { type: Date, default: Date.now },
  /** AES-256-GCM via lib/hrm-crypto — ciphertext + iv + authTag triples. */
  bankAccountNumber: { type: String, default: null },
  bankAccountNumberIv: { type: String, default: null },
  bankAccountNumberAuthTag: { type: String, default: null },
  ifscCode: { type: String, default: null },
  ifscCodeIv: { type: String, default: null },
  ifscCodeAuthTag: { type: String, default: null },
  bankName: { type: String, default: null },
  bankNameIv: { type: String, default: null },
  bankNameAuthTag: { type: String, default: null },
  panNumber: { type: String, default: null },
  panNumberIv: { type: String, default: null },
  panNumberAuthTag: { type: String, default: null },
}, { timestamps: true });

const payrollRunSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  year: { type: Number, required: true, index: true },
  month: { type: Number, required: true, index: true },
  status: { type: String, enum: payrollRunStatuses, default: "draft", index: true },
  reviewedAt: { type: Date },
  reviewedBy: { type: Number },
  finalizedAt: { type: Date },
  finalizedBy: { type: Number },
  notes: { type: String },
  /** Outgoing FinancePayments row created when this run is marked paid. */
  financePaymentId: { type: Number, default: null },
  financeExpenseId: { type: Number, default: null },
}, { timestamps: true });

payrollRunSchema.index({ year: 1, month: 1 }, { unique: true });

const payrollLineSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  payrollRunId: { type: Number, required: true, index: true },
  userId: { type: Number, required: true, index: true },
  paidDays: { type: Number, default: 0 },
  lopDays: { type: Number, default: 0 },
  lateCount: { type: Number, default: 0 },
  gross: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  lopDeduction: { type: Number, default: 0 },
  latePenalty: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  pfEmployee: { type: Number, default: 0 },
  pfEmployer: { type: Number, default: 0 },
  tds: { type: Number, default: 0 },
  notes: { type: String },
}, { timestamps: true });

payrollLineSchema.index({ payrollRunId: 1, userId: 1 }, { unique: true });

const payrollSlipSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  payrollLineId: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true, index: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  htmlContent: { type: String },
}, { timestamps: true });

payrollSlipSchema.index({ userId: 1, year: -1, month: -1 });

const SalaryStructures = mongoose.models.SalaryStructures || mongoose.model("SalaryStructures", salaryStructureSchema);
const PayrollRuns = mongoose.models.PayrollRuns || mongoose.model("PayrollRuns", payrollRunSchema);
const PayrollLines = mongoose.models.PayrollLines || mongoose.model("PayrollLines", payrollLineSchema);
const PayrollSlips = mongoose.models.PayrollSlips || mongoose.model("PayrollSlips", payrollSlipSchema);
const salaryStructuresTable = SalaryStructures;
const payrollRunsTable = PayrollRuns;
const payrollLinesTable = PayrollLines;
const payrollSlipsTable = PayrollSlips;

export {
  SalaryStructures,
  PayrollRuns,
  PayrollLines,
  PayrollSlips,
  salaryStructuresTable,
  payrollRunsTable,
  payrollLinesTable,
  payrollSlipsTable,
};
