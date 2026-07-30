import {
  CaGstFilings,
  CaTdsReturns,
  CaTdsCertificates,
  CaCompanyItr,
  CaDirectorItr,
  CaRocFilings,
  CaDinDsc,
  CaAudits,
  CaSuspenseEntries,
} from "../schema/phase2.js";
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
import {
  makeSoftCrud,
  requireEnum,
  requireDate,
  requireNumber,
  requireText,
  dateOnly,
  optionalString,
} from "../services/crud-factory.js";
import { upsertCalendarFromSource } from "../services/calendar-sync.js";

function syncGstCalendar(doc, req) {
  return upsertCalendarFromSource({
    sourceKey: `gst-filing:${doc.id}`,
    title: `${doc.returnType} — ${doc.period}`,
    category: "GST",
    dueDate: doc.dueDate,
    status: doc.status,
    createdBy: req.user.id,
  });
}

function syncTdsCalendar(doc, req) {
  return upsertCalendarFromSource({
    sourceKey: `tds-return:${doc.id}`,
    title: `TDS ${doc.returnType} — ${doc.quarter}`,
    category: "TDS",
    dueDate: doc.dueDate,
    status: doc.status,
    createdBy: req.user.id,
  });
}

function syncRocCalendar(doc, req) {
  return upsertCalendarFromSource({
    sourceKey: `roc-filing:${doc.id}`,
    title: `${doc.form} — ${doc.financialYear || "ROC"}`,
    category: "ROC",
    dueDate: doc.dueDate,
    status: doc.status,
    createdBy: req.user.id,
  });
}

function syncCompanyItrCalendar(doc, req) {
  return upsertCalendarFromSource({
    sourceKey: `company-itr:${doc.id}`,
    title: `Company ITR — ${doc.financialYear}`,
    category: "ITR",
    dueDate: doc.dueDate,
    status: doc.filingStatus,
    createdBy: req.user.id,
  });
}

function syncDirectorItrCalendar(doc, req) {
  return upsertCalendarFromSource({
    sourceKey: `director-itr:${doc.id}`,
    title: `Director ITR — ${doc.directorName} (${doc.financialYear})`,
    category: "ITR",
    dueDate: doc.dueDate,
    status: doc.filingStatus,
    createdBy: req.user.id,
    ownerName: doc.directorName || "CA Team",
  });
}

function daysToExpiry(expiry) {
  if (!expiry) return 0;
  const ms = new Date(expiry).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function deriveDscStatus(expiry) {
  const days = daysToExpiry(expiry);
  if (days < 0) return "overdue";
  if (days <= 90) return "upcoming";
  return "completed";
}

function ageDays(receivedAt) {
  if (!receivedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60 * 24)));
}

// ── GST filings ──────────────────────────────────────────────────────────

export const gstFilings = makeSoftCrud({
  table: CaGstFilings,
  sequenceKey: "ca_gst_filings",
  listKey: "filings",
  singularLabel: "GST filing",
  defaultSort: { dueDate: 1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.returnType) q.returnType = String(query.returnType);
    if (query.period) q.period = String(query.period);
  },
  format: (doc) => ({
    id: doc.id,
    returnType: doc.returnType,
    period: doc.period,
    dueDate: dateOnly(doc.dueDate),
    status: doc.status,
    filedAt: dateOnly(doc.filedAt),
    lateFee: Number(doc.lateFee ?? 0),
    interest: Number(doc.interest ?? 0),
    outputTax: Number(doc.outputTax ?? 0),
    inputTax: Number(doc.inputTax ?? 0),
    netTax: Number(doc.netTax ?? 0),
    notes: doc.notes ?? null,
  }),
  parseCreate: async (body) => ({
    returnType: requireEnum(body.returnType, CA_GST_RETURN_TYPES, "returnType"),
    period: requireText(body.period, "period"),
    dueDate: requireDate(body.dueDate, "dueDate"),
    status: body.status ? requireEnum(body.status, CA_FILING_STATUSES, "status") : "pending",
    filedAt: requireDate(body.filedAt, "filedAt", { required: false }),
    lateFee: requireNumber(body.lateFee ?? 0, "lateFee", { min: 0 }),
    interest: requireNumber(body.interest ?? 0, "interest", { min: 0 }),
    outputTax: requireNumber(body.outputTax ?? 0, "outputTax", { min: 0 }),
    inputTax: requireNumber(body.inputTax ?? 0, "inputTax", { min: 0 }),
    netTax: requireNumber(body.netTax ?? (Number(body.outputTax ?? 0) - Number(body.inputTax ?? 0)), "netTax"),
    notes: optionalString(body.notes),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.returnType !== undefined) out.returnType = requireEnum(body.returnType, CA_GST_RETURN_TYPES, "returnType");
    if (body.period !== undefined) out.period = requireText(body.period, "period");
    if (body.dueDate !== undefined) out.dueDate = requireDate(body.dueDate, "dueDate");
    if (body.status !== undefined) out.status = requireEnum(body.status, CA_FILING_STATUSES, "status");
    if (body.filedAt !== undefined) out.filedAt = requireDate(body.filedAt, "filedAt", { required: false });
    if (body.lateFee !== undefined) out.lateFee = requireNumber(body.lateFee, "lateFee", { min: 0 });
    if (body.interest !== undefined) out.interest = requireNumber(body.interest, "interest", { min: 0 });
    if (body.outputTax !== undefined) out.outputTax = requireNumber(body.outputTax, "outputTax", { min: 0 });
    if (body.inputTax !== undefined) out.inputTax = requireNumber(body.inputTax, "inputTax", { min: 0 });
    if (body.netTax !== undefined) out.netTax = requireNumber(body.netTax, "netTax");
    if (body.notes !== undefined) out.notes = optionalString(body.notes);
    return out;
  },
  afterCreate: syncGstCalendar,
  afterUpdate: syncGstCalendar,
});

// ── TDS returns ──────────────────────────────────────────────────────────

export const tdsReturns = makeSoftCrud({
  table: CaTdsReturns,
  sequenceKey: "ca_tds_returns",
  listKey: "returns",
  singularLabel: "TDS return",
  defaultSort: { dueDate: 1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.returnType) q.returnType = String(query.returnType);
    if (query.quarter) q.quarter = String(query.quarter);
  },
  format: (doc) => ({
    id: doc.id,
    returnType: doc.returnType,
    quarter: doc.quarter,
    dueDate: dateOnly(doc.dueDate),
    status: doc.status,
    filedAt: dateOnly(doc.filedAt),
    notes: doc.notes ?? null,
  }),
  parseCreate: async (body) => ({
    returnType: requireEnum(body.returnType, CA_TDS_RETURN_TYPES, "returnType"),
    quarter: requireText(body.quarter, "quarter"),
    dueDate: requireDate(body.dueDate, "dueDate"),
    status: body.status ? requireEnum(body.status, CA_FILING_STATUSES, "status") : "pending",
    filedAt: requireDate(body.filedAt, "filedAt", { required: false }),
    notes: optionalString(body.notes),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.returnType !== undefined) out.returnType = requireEnum(body.returnType, CA_TDS_RETURN_TYPES, "returnType");
    if (body.quarter !== undefined) out.quarter = requireText(body.quarter, "quarter");
    if (body.dueDate !== undefined) out.dueDate = requireDate(body.dueDate, "dueDate");
    if (body.status !== undefined) out.status = requireEnum(body.status, CA_FILING_STATUSES, "status");
    if (body.filedAt !== undefined) out.filedAt = requireDate(body.filedAt, "filedAt", { required: false });
    if (body.notes !== undefined) out.notes = optionalString(body.notes);
    return out;
  },
  afterCreate: syncTdsCalendar,
  afterUpdate: syncTdsCalendar,
});

// ── TDS certificates ─────────────────────────────────────────────────────

export const tdsCertificates = makeSoftCrud({
  table: CaTdsCertificates,
  sequenceKey: "ca_tds_certificates",
  listKey: "certificates",
  singularLabel: "TDS certificate",
  buildListQuery: (q, query) => {
    if (query.form) q.form = String(query.form);
    if (query.issued != null) q.issued = String(query.issued) === "true";
    if (query.search) {
      const rx = { $regex: String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      q.$or = [{ party: rx }, { pan: rx }];
    }
  },
  format: (doc) => ({
    id: doc.id,
    form: doc.form,
    party: doc.party,
    pan: doc.pan,
    amount: Number(doc.amount ?? 0),
    issued: Boolean(doc.issued),
    issuedAt: dateOnly(doc.issuedAt),
    financialYear: doc.financialYear ?? null,
  }),
  parseCreate: async (body) => ({
    form: requireEnum(body.form, CA_TDS_CERTIFICATE_FORMS, "form"),
    party: requireText(body.party, "party"),
    pan: requireText(body.pan, "pan").toUpperCase(),
    amount: requireNumber(body.amount, "amount", { min: 0 }),
    issued: Boolean(body.issued),
    issuedAt: requireDate(body.issuedAt, "issuedAt", { required: false }),
    financialYear: optionalString(body.financialYear),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.form !== undefined) out.form = requireEnum(body.form, CA_TDS_CERTIFICATE_FORMS, "form");
    if (body.party !== undefined) out.party = requireText(body.party, "party");
    if (body.pan !== undefined) out.pan = requireText(body.pan, "pan").toUpperCase();
    if (body.amount !== undefined) out.amount = requireNumber(body.amount, "amount", { min: 0 });
    if (body.issued !== undefined) out.issued = Boolean(body.issued);
    if (body.issuedAt !== undefined) out.issuedAt = requireDate(body.issuedAt, "issuedAt", { required: false });
    if (body.financialYear !== undefined) out.financialYear = optionalString(body.financialYear);
    return out;
  },
});

// ── Company ITR ──────────────────────────────────────────────────────────

export const companyItr = makeSoftCrud({
  table: CaCompanyItr,
  sequenceKey: "ca_company_itr",
  listKey: "records",
  singularLabel: "Company ITR",
  defaultSort: { financialYear: -1 },
  format: (doc) => ({
    id: doc.id,
    financialYear: doc.financialYear,
    revenue: Number(doc.revenue ?? 0),
    expenses: Number(doc.expenses ?? 0),
    profitBeforeTax: Number(doc.profitBeforeTax ?? 0),
    taxLiability: Number(doc.taxLiability ?? 0),
    filingStatus: doc.filingStatus,
    dueDate: dateOnly(doc.dueDate),
    filedAt: dateOnly(doc.filedAt),
    documents: Array.isArray(doc.documents) ? doc.documents : [],
  }),
  parseCreate: async (body) => ({
    financialYear: requireText(body.financialYear, "financialYear"),
    revenue: requireNumber(body.revenue ?? 0, "revenue", { min: 0 }),
    expenses: requireNumber(body.expenses ?? 0, "expenses", { min: 0 }),
    profitBeforeTax: requireNumber(body.profitBeforeTax ?? 0, "profitBeforeTax"),
    taxLiability: requireNumber(body.taxLiability ?? 0, "taxLiability", { min: 0 }),
    filingStatus: body.filingStatus
      ? requireEnum(body.filingStatus, CA_FILING_STATUSES, "filingStatus")
      : "draft",
    dueDate: requireDate(body.dueDate, "dueDate"),
    filedAt: requireDate(body.filedAt, "filedAt", { required: false }),
    documents: Array.isArray(body.documents) ? body.documents : [],
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.financialYear !== undefined) out.financialYear = requireText(body.financialYear, "financialYear");
    if (body.revenue !== undefined) out.revenue = requireNumber(body.revenue, "revenue", { min: 0 });
    if (body.expenses !== undefined) out.expenses = requireNumber(body.expenses, "expenses", { min: 0 });
    if (body.profitBeforeTax !== undefined) out.profitBeforeTax = requireNumber(body.profitBeforeTax, "profitBeforeTax");
    if (body.taxLiability !== undefined) out.taxLiability = requireNumber(body.taxLiability, "taxLiability", { min: 0 });
    if (body.filingStatus !== undefined) out.filingStatus = requireEnum(body.filingStatus, CA_FILING_STATUSES, "filingStatus");
    if (body.dueDate !== undefined) out.dueDate = requireDate(body.dueDate, "dueDate");
    if (body.filedAt !== undefined) out.filedAt = requireDate(body.filedAt, "filedAt", { required: false });
    if (body.documents !== undefined) out.documents = Array.isArray(body.documents) ? body.documents : [];
    return out;
  },
  afterCreate: syncCompanyItrCalendar,
  afterUpdate: syncCompanyItrCalendar,
});

// ── Director ITR ─────────────────────────────────────────────────────────

export const directorItr = makeSoftCrud({
  table: CaDirectorItr,
  sequenceKey: "ca_director_itr",
  listKey: "records",
  singularLabel: "Director ITR",
  buildListQuery: (q, query) => {
    if (query.filingStatus) q.filingStatus = String(query.filingStatus);
    if (query.search) {
      const rx = { $regex: String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      q.$or = [{ directorName: rx }, { pan: rx }];
    }
  },
  format: (doc) => ({
    id: doc.id,
    directorName: doc.directorName,
    pan: doc.pan,
    financialYear: doc.financialYear,
    filingStatus: doc.filingStatus,
    dueDate: dateOnly(doc.dueDate),
    taxLiability: Number(doc.taxLiability ?? 0),
    filedAt: dateOnly(doc.filedAt),
  }),
  parseCreate: async (body) => ({
    directorName: requireText(body.directorName, "directorName"),
    pan: requireText(body.pan, "pan").toUpperCase(),
    financialYear: requireText(body.financialYear, "financialYear"),
    filingStatus: body.filingStatus
      ? requireEnum(body.filingStatus, CA_FILING_STATUSES, "filingStatus")
      : "pending",
    dueDate: requireDate(body.dueDate, "dueDate"),
    taxLiability: requireNumber(body.taxLiability ?? 0, "taxLiability", { min: 0 }),
    filedAt: requireDate(body.filedAt, "filedAt", { required: false }),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.directorName !== undefined) out.directorName = requireText(body.directorName, "directorName");
    if (body.pan !== undefined) out.pan = requireText(body.pan, "pan").toUpperCase();
    if (body.financialYear !== undefined) out.financialYear = requireText(body.financialYear, "financialYear");
    if (body.filingStatus !== undefined) out.filingStatus = requireEnum(body.filingStatus, CA_FILING_STATUSES, "filingStatus");
    if (body.dueDate !== undefined) out.dueDate = requireDate(body.dueDate, "dueDate");
    if (body.taxLiability !== undefined) out.taxLiability = requireNumber(body.taxLiability, "taxLiability", { min: 0 });
    if (body.filedAt !== undefined) out.filedAt = requireDate(body.filedAt, "filedAt", { required: false });
    return out;
  },
  afterCreate: syncDirectorItrCalendar,
  afterUpdate: syncDirectorItrCalendar,
});

// ── ROC ──────────────────────────────────────────────────────────────────

export const rocFilings = makeSoftCrud({
  table: CaRocFilings,
  sequenceKey: "ca_roc_filings",
  listKey: "filings",
  singularLabel: "ROC filing",
  defaultSort: { dueDate: 1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.form) q.form = String(query.form);
  },
  format: (doc) => ({
    id: doc.id,
    form: doc.form,
    financialYear: doc.financialYear,
    dueDate: dateOnly(doc.dueDate),
    status: doc.status,
    filedAt: dateOnly(doc.filedAt),
    notes: doc.notes ?? null,
  }),
  parseCreate: async (body) => ({
    form: requireEnum(body.form, CA_ROC_FORMS, "form"),
    financialYear: requireText(body.financialYear, "financialYear"),
    dueDate: requireDate(body.dueDate, "dueDate"),
    status: body.status ? requireEnum(body.status, CA_FILING_STATUSES, "status") : "pending",
    filedAt: requireDate(body.filedAt, "filedAt", { required: false }),
    notes: optionalString(body.notes),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.form !== undefined) out.form = requireEnum(body.form, CA_ROC_FORMS, "form");
    if (body.financialYear !== undefined) out.financialYear = requireText(body.financialYear, "financialYear");
    if (body.dueDate !== undefined) out.dueDate = requireDate(body.dueDate, "dueDate");
    if (body.status !== undefined) out.status = requireEnum(body.status, CA_FILING_STATUSES, "status");
    if (body.filedAt !== undefined) out.filedAt = requireDate(body.filedAt, "filedAt", { required: false });
    if (body.notes !== undefined) out.notes = optionalString(body.notes);
    return out;
  },
  afterCreate: syncRocCalendar,
  afterUpdate: syncRocCalendar,
});

// ── DIN / DSC ────────────────────────────────────────────────────────────

export const dinDsc = makeSoftCrud({
  table: CaDinDsc,
  sequenceKey: "ca_din_dsc",
  listKey: "records",
  singularLabel: "DIN/DSC record",
  defaultSort: { dscExpiry: 1 },
  buildListQuery: (q, query) => {
    if (query.dscStatus) q.dscStatus = String(query.dscStatus);
    if (query.search) {
      const rx = { $regex: String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      q.$or = [{ directorName: rx }, { din: rx }];
    }
  },
  format: (doc) => {
    const days = daysToExpiry(doc.dscExpiry);
    return {
      id: doc.id,
      directorName: doc.directorName,
      din: doc.din,
      dscExpiry: dateOnly(doc.dscExpiry),
      dscStatus: doc.dscStatus || deriveDscStatus(doc.dscExpiry),
      daysToExpiry: days,
      notes: doc.notes ?? null,
    };
  },
  parseCreate: async (body) => {
    const dscExpiry = requireDate(body.dscExpiry, "dscExpiry");
    return {
      directorName: requireText(body.directorName, "directorName"),
      din: requireText(body.din, "din"),
      dscExpiry,
      dscStatus: body.dscStatus
        ? requireEnum(body.dscStatus, CA_COMPLIANCE_TIMING, "dscStatus")
        : deriveDscStatus(dscExpiry),
      notes: optionalString(body.notes),
    };
  },
  parsePatch: async (body) => {
    const out = {};
    if (body.directorName !== undefined) out.directorName = requireText(body.directorName, "directorName");
    if (body.din !== undefined) out.din = requireText(body.din, "din");
    if (body.dscExpiry !== undefined) {
      out.dscExpiry = requireDate(body.dscExpiry, "dscExpiry");
      if (body.dscStatus === undefined) out.dscStatus = deriveDscStatus(out.dscExpiry);
    }
    if (body.dscStatus !== undefined) out.dscStatus = requireEnum(body.dscStatus, CA_COMPLIANCE_TIMING, "dscStatus");
    if (body.notes !== undefined) out.notes = optionalString(body.notes);
    return out;
  },
});

// ── Audits ───────────────────────────────────────────────────────────────

export const audits = makeSoftCrud({
  table: CaAudits,
  sequenceKey: "ca_audits",
  listKey: "records",
  singularLabel: "Audit record",
  buildListQuery: (q, query) => {
    if (query.type) q.type = String(query.type);
    if (query.phase) q.phase = String(query.phase);
  },
  format: (doc) => ({
    id: doc.id,
    type: doc.type,
    auditor: doc.auditor,
    financialYear: doc.financialYear,
    phase: doc.phase,
    observations: Number(doc.observations ?? 0),
    status: doc.status,
    firm: doc.firm ?? null,
    partner: doc.partner ?? null,
    membershipNo: doc.membershipNo ?? null,
    notes: doc.notes ?? null,
  }),
  parseCreate: async (body) => ({
    type: requireEnum(body.type, CA_AUDIT_TYPES, "type"),
    auditor: requireText(body.auditor, "auditor"),
    financialYear: requireText(body.financialYear, "financialYear"),
    phase: body.phase ? requireEnum(body.phase, CA_AUDIT_PHASES, "phase") : "planning",
    observations: requireNumber(body.observations ?? 0, "observations", { min: 0 }),
    status: body.status ? requireEnum(body.status, CA_COMPLIANCE_TIMING, "status") : "upcoming",
    firm: optionalString(body.firm),
    partner: optionalString(body.partner),
    membershipNo: optionalString(body.membershipNo),
    notes: optionalString(body.notes),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.type !== undefined) out.type = requireEnum(body.type, CA_AUDIT_TYPES, "type");
    if (body.auditor !== undefined) out.auditor = requireText(body.auditor, "auditor");
    if (body.financialYear !== undefined) out.financialYear = requireText(body.financialYear, "financialYear");
    if (body.phase !== undefined) out.phase = requireEnum(body.phase, CA_AUDIT_PHASES, "phase");
    if (body.observations !== undefined) out.observations = requireNumber(body.observations, "observations", { min: 0 });
    if (body.status !== undefined) out.status = requireEnum(body.status, CA_COMPLIANCE_TIMING, "status");
    if (body.firm !== undefined) out.firm = optionalString(body.firm);
    if (body.partner !== undefined) out.partner = optionalString(body.partner);
    if (body.membershipNo !== undefined) out.membershipNo = optionalString(body.membershipNo);
    if (body.notes !== undefined) out.notes = optionalString(body.notes);
    return out;
  },
});

// ── Suspense ─────────────────────────────────────────────────────────────

export const suspense = makeSoftCrud({
  table: CaSuspenseEntries,
  sequenceKey: "ca_suspense",
  listKey: "entries",
  singularLabel: "Suspense entry",
  defaultSort: { receivedAt: -1 },
  buildListQuery: (q, query) => {
    if (query.resolved === "false") q.resolvedAt = null;
    if (query.resolved === "true") q.resolvedAt = { $ne: null };
    if (query.search) {
      const rx = { $regex: String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      q.$or = [{ bankRef: rx }, { remarks: rx }];
    }
  },
  format: (doc) => ({
    id: doc.id,
    receivedAt: dateOnly(doc.receivedAt),
    amount: Number(doc.amount ?? 0),
    bankRef: doc.bankRef,
    mode: doc.mode,
    remarks: doc.remarks ?? "",
    ageDays: ageDays(doc.receivedAt),
    financePaymentId: doc.financePaymentId ?? null,
    assignedClientId: doc.assignedClientId ?? null,
    assignedVendorId: doc.assignedVendorId ?? null,
    resolvedAt: dateOnly(doc.resolvedAt),
  }),
  parseCreate: async (body) => ({
    receivedAt: requireDate(body.receivedAt, "receivedAt"),
    amount: requireNumber(body.amount, "amount", { min: 0 }),
    bankRef: requireText(body.bankRef, "bankRef"),
    mode: body.mode ? requireEnum(body.mode, CA_PAYMENT_MODES, "mode") : "neft",
    remarks: optionalString(body.remarks) ?? "",
    financePaymentId: body.financePaymentId != null ? Number(body.financePaymentId) : null,
    assignedClientId: body.assignedClientId != null ? Number(body.assignedClientId) : null,
    assignedVendorId: body.assignedVendorId != null ? Number(body.assignedVendorId) : null,
    resolvedAt: requireDate(body.resolvedAt, "resolvedAt", { required: false }),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.receivedAt !== undefined) out.receivedAt = requireDate(body.receivedAt, "receivedAt");
    if (body.amount !== undefined) out.amount = requireNumber(body.amount, "amount", { min: 0 });
    if (body.bankRef !== undefined) out.bankRef = requireText(body.bankRef, "bankRef");
    if (body.mode !== undefined) out.mode = requireEnum(body.mode, CA_PAYMENT_MODES, "mode");
    if (body.remarks !== undefined) out.remarks = optionalString(body.remarks) ?? "";
    if (body.financePaymentId !== undefined) {
      out.financePaymentId = body.financePaymentId != null ? Number(body.financePaymentId) : null;
    }
    // Assignment + resolve must go through POST /ca/suspense/:id/assign (creates Finance payment).
    if (body.assignedClientId !== undefined) {
      out.assignedClientId = body.assignedClientId != null ? Number(body.assignedClientId) : null;
    }
    if (body.assignedVendorId !== undefined) {
      out.assignedVendorId = body.assignedVendorId != null ? Number(body.assignedVendorId) : null;
    }
    if (body.resolvedAt !== undefined) out.resolvedAt = requireDate(body.resolvedAt, "resolvedAt", { required: false });
    return out;
  },
});
