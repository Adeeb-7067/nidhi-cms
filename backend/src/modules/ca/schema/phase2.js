import mongoose, { Schema } from "mongoose";
import {
  CA_AUDIT_PHASES,
  CA_AUDIT_TYPES,
  CA_COMPLIANCE_TIMING,
  CA_FILING_STATUSES,
  CA_GST_RETURN_TYPES,
  CA_PAYMENT_MODES,
  CA_ROC_FORMS,
  CA_TDS_CERTIFICATE_FORMS,
  CA_TDS_RETURN_TYPES,
} from "../../../constants/ca.js";

const softDelete = {
  isDeleted: { type: Boolean, default: false, required: true, index: true },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Number, ref: "Users", required: true },
};

const gstFilingSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    returnType: { type: String, enum: CA_GST_RETURN_TYPES, required: true, index: true },
    period: { type: String, required: true, trim: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: CA_FILING_STATUSES, default: "pending", required: true, index: true },
    filedAt: { type: Date, default: null },
    lateFee: { type: Number, default: 0, min: 0 },
    interest: { type: Number, default: 0, min: 0 },
    /** Amounts declared on the return (GSTR-3B) for books-vs-return variance. */
    outputTax: { type: Number, default: 0, min: 0 },
    inputTax: { type: Number, default: 0, min: 0 },
    netTax: { type: Number, default: 0 },
    notes: { type: String, default: null, trim: true },
    ...softDelete,
  },
  { timestamps: true },
);

const tdsReturnSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    returnType: { type: String, enum: CA_TDS_RETURN_TYPES, required: true, index: true },
    quarter: { type: String, required: true, trim: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: CA_FILING_STATUSES, default: "pending", required: true, index: true },
    filedAt: { type: Date, default: null },
    notes: { type: String, default: null, trim: true },
    ...softDelete,
  },
  { timestamps: true },
);

const tdsCertificateSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    form: { type: String, enum: CA_TDS_CERTIFICATE_FORMS, required: true, index: true },
    party: { type: String, required: true, trim: true },
    pan: { type: String, required: true, trim: true, uppercase: true },
    amount: { type: Number, required: true, min: 0 },
    issued: { type: Boolean, default: false, required: true, index: true },
    issuedAt: { type: Date, default: null },
    financialYear: { type: String, default: null, trim: true },
    ...softDelete,
  },
  { timestamps: true },
);

const companyItrSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    revenue: { type: Number, default: 0, min: 0 },
    expenses: { type: Number, default: 0, min: 0 },
    profitBeforeTax: { type: Number, default: 0 },
    taxLiability: { type: Number, default: 0, min: 0 },
    filingStatus: { type: String, enum: CA_FILING_STATUSES, default: "draft", required: true, index: true },
    dueDate: { type: Date, required: true },
    filedAt: { type: Date, default: null },
    documents: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true, trim: true },
        uploaded: { type: Boolean, default: false },
        fileUrl: { type: String, default: null },
      },
    ],
    ...softDelete,
  },
  { timestamps: true },
);

const directorItrSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    directorName: { type: String, required: true, trim: true },
    pan: { type: String, required: true, trim: true, uppercase: true, index: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    filingStatus: { type: String, enum: CA_FILING_STATUSES, default: "pending", required: true, index: true },
    dueDate: { type: Date, required: true },
    taxLiability: { type: Number, default: 0, min: 0 },
    filedAt: { type: Date, default: null },
    ...softDelete,
  },
  { timestamps: true },
);

const rocFilingSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    form: { type: String, enum: CA_ROC_FORMS, required: true, index: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: CA_FILING_STATUSES, default: "pending", required: true, index: true },
    filedAt: { type: Date, default: null },
    notes: { type: String, default: null, trim: true },
    ...softDelete,
  },
  { timestamps: true },
);

const dinDscSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    directorName: { type: String, required: true, trim: true },
    din: { type: String, required: true, trim: true, index: true },
    dscExpiry: { type: Date, required: true, index: true },
    dscStatus: { type: String, enum: CA_COMPLIANCE_TIMING, default: "upcoming", required: true, index: true },
    notes: { type: String, default: null, trim: true },
    ...softDelete,
  },
  { timestamps: true },
);

const auditSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    type: { type: String, enum: CA_AUDIT_TYPES, required: true, index: true },
    auditor: { type: String, required: true, trim: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    phase: { type: String, enum: CA_AUDIT_PHASES, default: "planning", required: true, index: true },
    observations: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: CA_COMPLIANCE_TIMING, default: "upcoming", required: true, index: true },
    firm: { type: String, default: null, trim: true },
    partner: { type: String, default: null, trim: true },
    membershipNo: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
    ...softDelete,
  },
  { timestamps: true },
);

const suspenseSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    receivedAt: { type: Date, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    bankRef: { type: String, required: true, trim: true, index: true },
    mode: { type: String, enum: CA_PAYMENT_MODES, default: "neft", required: true },
    remarks: { type: String, default: "", trim: true },
    financePaymentId: { type: Number, default: null, index: true },
    assignedClientId: { type: Number, default: null },
    assignedVendorId: { type: Number, default: null },
    resolvedAt: { type: Date, default: null },
    ...softDelete,
  },
  { timestamps: true },
);

function model(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

export const CaGstFilings = model("CaGstFilings", gstFilingSchema);
export const CaTdsReturns = model("CaTdsReturns", tdsReturnSchema);
export const CaTdsCertificates = model("CaTdsCertificates", tdsCertificateSchema);
export const CaCompanyItr = model("CaCompanyItr", companyItrSchema);
export const CaDirectorItr = model("CaDirectorItr", directorItrSchema);
export const CaRocFilings = model("CaRocFilings", rocFilingSchema);
export const CaDinDsc = model("CaDinDsc", dinDscSchema);
export const CaAudits = model("CaAudits", auditSchema);
export const CaSuspenseEntries = model("CaSuspenseEntries", suspenseSchema);

const scoreHistorySchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    /** YYYY-MM */
    monthKey: { type: String, required: true, unique: true, index: true },
    monthLabel: { type: String, required: true },
    gst: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    roc: { type: Number, default: 0 },
    audit: { type: Number, default: 0 },
    overall: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const CaScoreHistory = model("CaScoreHistory", scoreHistorySchema);
