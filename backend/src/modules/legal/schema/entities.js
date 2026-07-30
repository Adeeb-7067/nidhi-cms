import mongoose, { Schema } from "mongoose";
import {
  LEGAL_AGREEMENT_STATUSES,
  LEGAL_AGREEMENT_TYPES,
  LEGAL_CLIENT_MATTER_STATUSES,
  LEGAL_COMPLIANCE_STATUSES,
  LEGAL_COUNSEL_ROLES,
  LEGAL_COURT_CASE_STATUSES,
  LEGAL_EMPLOYEE_CASE_STATUSES,
  LEGAL_EMPLOYEE_CASE_TYPES,
  LEGAL_EXPENSE_CATEGORIES,
  LEGAL_NDA_PARTY_TYPES,
  LEGAL_NDA_STATUSES,
  LEGAL_NOTICE_DIRECTIONS,
  LEGAL_NOTICE_STATUSES,
  LEGAL_RISK_LEVELS,
  LEGAL_VENDOR_DISPUTE_STATUSES,
} from "../../../constants/legal.js";

const softDelete = {
  isDeleted: { type: Boolean, default: false, required: true, index: true },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Number, ref: "Users", required: true },
};

/** Snapshot of counsel at assign time (matches frontend LegalCounsel shape). */
const counselSnapshot = {
  id: { type: Number, required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  role: { type: String, enum: LEGAL_COUNSEL_ROLES, required: true },
};

const employeeCaseSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    caseNumber: { type: String, required: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    type: { type: String, enum: LEGAL_EMPLOYEE_CASE_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: LEGAL_EMPLOYEE_CASE_STATUSES,
      default: "open",
      required: true,
      index: true,
    },
    risk: { type: String, enum: LEGAL_RISK_LEVELS, default: "medium", required: true, index: true },
    assignedTo: { type: counselSnapshot, required: true },
    openedAt: { type: Date, required: true, index: true },
    summary: { type: String, required: true, trim: true },
    nextHearing: { type: Date, default: null },
    ...softDelete,
  },
  { timestamps: true },
);

employeeCaseSchema.index(
  { caseNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

const vendorDisputeSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    vendorName: { type: String, required: true, trim: true },
    contractRef: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: LEGAL_VENDOR_DISPUTE_STATUSES,
      default: "open",
      required: true,
      index: true,
    },
    risk: { type: String, enum: LEGAL_RISK_LEVELS, default: "medium", required: true, index: true },
    amountInDispute: { type: Number, required: true, min: 0 },
    assignedTo: { type: counselSnapshot, required: true },
    openedAt: { type: Date, required: true, index: true },
    summary: { type: String, required: true, trim: true },
    ...softDelete,
  },
  { timestamps: true },
);

const clientMatterSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    clientName: { type: String, required: true, trim: true },
    matterTitle: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: LEGAL_CLIENT_MATTER_STATUSES,
      default: "active",
      required: true,
      index: true,
    },
    risk: { type: String, enum: LEGAL_RISK_LEVELS, default: "medium", required: true, index: true },
    assignedTo: { type: counselSnapshot, required: true },
    openedAt: { type: Date, required: true, index: true },
    contractValue: { type: Number, required: true, min: 0 },
    ...softDelete,
  },
  { timestamps: true },
);

const ndaSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    partyName: { type: String, required: true, trim: true },
    partyType: { type: String, enum: LEGAL_NDA_PARTY_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: LEGAL_NDA_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    signedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
    risk: { type: String, enum: LEGAL_RISK_LEVELS, default: "low", required: true, index: true },
    assignedTo: { type: counselSnapshot, required: true },
    ...softDelete,
  },
  { timestamps: true },
);

const agreementSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    title: { type: String, required: true, trim: true },
    counterparty: { type: String, required: true, trim: true },
    type: { type: String, enum: LEGAL_AGREEMENT_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: LEGAL_AGREEMENT_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    effectiveFrom: { type: Date, required: true },
    renewalDate: { type: Date, required: true, index: true },
    risk: { type: String, enum: LEGAL_RISK_LEVELS, default: "low", required: true, index: true },
    assignedTo: { type: counselSnapshot, required: true },
    ...softDelete,
  },
  { timestamps: true },
);

const noticeSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    reference: { type: String, required: true, trim: true },
    direction: { type: String, enum: LEGAL_NOTICE_DIRECTIONS, required: true, index: true },
    subject: { type: String, required: true, trim: true },
    counterparty: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: LEGAL_NOTICE_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    risk: { type: String, enum: LEGAL_RISK_LEVELS, default: "medium", required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    assignedTo: { type: counselSnapshot, required: true },
    ...softDelete,
  },
  { timestamps: true },
);

noticeSchema.index(
  { reference: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

const courtCaseSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    caseNumber: { type: String, required: true, trim: true },
    court: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: LEGAL_COURT_CASE_STATUSES,
      default: "filed",
      required: true,
      index: true,
    },
    risk: { type: String, enum: LEGAL_RISK_LEVELS, default: "medium", required: true, index: true },
    nextHearing: { type: Date, default: null, index: true },
    assignedTo: { type: counselSnapshot, required: true },
    openedAt: { type: Date, required: true, index: true },
    ...softDelete,
  },
  { timestamps: true },
);

courtCaseSchema.index(
  { caseNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

const complianceSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    framework: { type: String, required: true, trim: true, index: true },
    requirement: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: LEGAL_COMPLIANCE_STATUSES,
      default: "review_pending",
      required: true,
      index: true,
    },
    risk: { type: String, enum: LEGAL_RISK_LEVELS, default: "medium", required: true, index: true },
    lastReview: { type: Date, required: true },
    nextReview: { type: Date, required: true, index: true },
    owner: { type: counselSnapshot, required: true },
    ...softDelete,
  },
  { timestamps: true },
);

const expenseSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    date: { type: Date, required: true, index: true },
    category: { type: String, enum: LEGAL_EXPENSE_CATEGORIES, required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    matterRef: { type: String, required: true, trim: true },
    approvedBy: { type: String, required: true, trim: true },
    receiptAttached: { type: Boolean, default: false, required: true },
    ...softDelete,
  },
  { timestamps: true },
);

function model(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

export const LegalEmployeeCases = model("LegalEmployeeCases", employeeCaseSchema);
export const LegalVendorDisputes = model("LegalVendorDisputes", vendorDisputeSchema);
export const LegalClientMatters = model("LegalClientMatters", clientMatterSchema);
export const LegalNdaRecords = model("LegalNdaRecords", ndaSchema);
export const LegalAgreements = model("LegalAgreements", agreementSchema);
export const LegalNotices = model("LegalNotices", noticeSchema);
export const LegalCourtCases = model("LegalCourtCases", courtCaseSchema);
export const LegalComplianceItems = model("LegalComplianceItems", complianceSchema);
export const LegalExpenses = model("LegalExpenses", expenseSchema);
