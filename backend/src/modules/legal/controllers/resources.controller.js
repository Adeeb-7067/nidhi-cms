import { toIso } from "../../../utils/mongo-list.js";
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
import {
  LegalCounsel,
  LegalEmployeeCases,
  LegalVendorDisputes,
  LegalClientMatters,
  LegalNdaRecords,
  LegalAgreements,
  LegalNotices,
  LegalCourtCases,
  LegalComplianceItems,
  LegalExpenses,
} from "../schema/index.js";
import {
  makeSoftCrud,
  requireEnum,
  requireDate,
  requireNumber,
  requireText,
  requireBool,
  optionalString,
} from "../services/crud-factory.js";
import { formatCounsel } from "../services/helpers.js";
import { resolveCounselSnapshot, nextRefNumber } from "../services/counsel-resolve.js";
import {
  deriveNdaStatus,
  deriveAgreementStatus,
} from "../services/dashboard.service.js";

function textSearch(query, fields) {
  const q = optionalString(query.q) || optionalString(query.search);
  if (!q) return null;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return { $or: fields.map((f) => ({ [f]: re })) };
}

function applySearch(mongoQuery, query, fields) {
  const clause = textSearch(query, fields);
  if (!clause) return;
  Object.assign(mongoQuery, clause);
}

function formatAssigned(doc) {
  return formatCounsel(doc?.assignedTo ?? doc?.owner);
}

// ── Counsel ──────────────────────────────────────────────────────────────

export const counsel = makeSoftCrud({
  table: LegalCounsel,
  sequenceKey: "legal_counsel",
  listKey: "counsel",
  singularLabel: "Counsel",
  defaultSort: { name: 1 },
  buildListQuery: (q, query) => {
    if (query.role) q.role = String(query.role);
    applySearch(q, query, ["name", "email"]);
  },
  format: (doc) => formatCounsel(doc),
  parseCreate: async (body) => ({
    name: requireText(body.name, "name"),
    email: requireText(body.email, "email").toLowerCase(),
    role: requireEnum(body.role, LEGAL_COUNSEL_ROLES, "role"),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.name !== undefined) out.name = requireText(body.name, "name");
    if (body.email !== undefined) out.email = requireText(body.email, "email").toLowerCase();
    if (body.role !== undefined) out.role = requireEnum(body.role, LEGAL_COUNSEL_ROLES, "role");
    return out;
  },
});

// ── Employee cases ───────────────────────────────────────────────────────

export const employeeCases = makeSoftCrud({
  table: LegalEmployeeCases,
  sequenceKey: "legal_employee_cases",
  listKey: "cases",
  singularLabel: "Employee case",
  defaultSort: { updatedAt: -1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.type) q.type = String(query.type);
    if (query.risk) q.risk = String(query.risk);
    applySearch(q, query, ["caseNumber", "employeeName", "department", "summary"]);
  },
  format: (doc) => ({
    id: doc.id,
    caseNumber: doc.caseNumber,
    employeeName: doc.employeeName,
    department: doc.department,
    type: doc.type,
    status: doc.status,
    risk: doc.risk,
    assignedTo: formatAssigned(doc),
    openedAt: toIso(doc.openedAt),
    updatedAt: toIso(doc.updatedAt),
    summary: doc.summary,
    nextHearing: toIso(doc.nextHearing),
  }),
  parseCreate: async (body) => {
    const assignedTo = await resolveCounselSnapshot(body);
    return {
      caseNumber:
        optionalString(body.caseNumber) ||
        (await nextRefNumber("legal_employee_case_ref", "ELC")),
      employeeName: requireText(body.employeeName, "employeeName"),
      department: requireText(body.department, "department"),
      type: requireEnum(body.type, LEGAL_EMPLOYEE_CASE_TYPES, "type"),
      status: body.status
        ? requireEnum(body.status, LEGAL_EMPLOYEE_CASE_STATUSES, "status")
        : "open",
      risk: body.risk ? requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk") : "medium",
      assignedTo,
      openedAt: requireDate(body.openedAt ?? new Date().toISOString(), "openedAt"),
      summary: requireText(body.summary, "summary"),
      nextHearing: requireDate(body.nextHearing, "nextHearing", { required: false }),
    };
  },
  parsePatch: async (body) => {
    const out = {};
    if (body.caseNumber !== undefined) out.caseNumber = requireText(body.caseNumber, "caseNumber");
    if (body.employeeName !== undefined) out.employeeName = requireText(body.employeeName, "employeeName");
    if (body.department !== undefined) out.department = requireText(body.department, "department");
    if (body.type !== undefined) out.type = requireEnum(body.type, LEGAL_EMPLOYEE_CASE_TYPES, "type");
    if (body.status !== undefined) {
      out.status = requireEnum(body.status, LEGAL_EMPLOYEE_CASE_STATUSES, "status");
    }
    if (body.risk !== undefined) out.risk = requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk");
    if (body.assignedToId !== undefined || body.assignedTo !== undefined) {
      out.assignedTo = await resolveCounselSnapshot(body);
    }
    if (body.openedAt !== undefined) out.openedAt = requireDate(body.openedAt, "openedAt");
    if (body.summary !== undefined) out.summary = requireText(body.summary, "summary");
    if (body.nextHearing !== undefined) {
      out.nextHearing = requireDate(body.nextHearing, "nextHearing", { required: false });
    }
    return out;
  },
});

// ── Vendor disputes ──────────────────────────────────────────────────────

export const vendorDisputes = makeSoftCrud({
  table: LegalVendorDisputes,
  sequenceKey: "legal_vendor_disputes",
  listKey: "disputes",
  singularLabel: "Vendor dispute",
  defaultSort: { openedAt: -1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.risk) q.risk = String(query.risk);
    applySearch(q, query, ["vendorName", "contractRef", "summary"]);
  },
  format: (doc) => ({
    id: doc.id,
    vendorName: doc.vendorName,
    contractRef: doc.contractRef,
    status: doc.status,
    risk: doc.risk,
    amountInDispute: Number(doc.amountInDispute ?? 0),
    assignedTo: formatAssigned(doc),
    openedAt: toIso(doc.openedAt),
    summary: doc.summary,
  }),
  parseCreate: async (body) => ({
    vendorName: requireText(body.vendorName, "vendorName"),
    contractRef: requireText(body.contractRef, "contractRef"),
    status: body.status
      ? requireEnum(body.status, LEGAL_VENDOR_DISPUTE_STATUSES, "status")
      : "open",
    risk: body.risk ? requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk") : "medium",
    amountInDispute: requireNumber(body.amountInDispute, "amountInDispute", { min: 0 }),
    assignedTo: await resolveCounselSnapshot(body),
    openedAt: requireDate(body.openedAt ?? new Date().toISOString(), "openedAt"),
    summary: requireText(body.summary, "summary"),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.vendorName !== undefined) out.vendorName = requireText(body.vendorName, "vendorName");
    if (body.contractRef !== undefined) out.contractRef = requireText(body.contractRef, "contractRef");
    if (body.status !== undefined) {
      out.status = requireEnum(body.status, LEGAL_VENDOR_DISPUTE_STATUSES, "status");
    }
    if (body.risk !== undefined) out.risk = requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk");
    if (body.amountInDispute !== undefined) {
      out.amountInDispute = requireNumber(body.amountInDispute, "amountInDispute", { min: 0 });
    }
    if (body.assignedToId !== undefined || body.assignedTo !== undefined) {
      out.assignedTo = await resolveCounselSnapshot(body);
    }
    if (body.openedAt !== undefined) out.openedAt = requireDate(body.openedAt, "openedAt");
    if (body.summary !== undefined) out.summary = requireText(body.summary, "summary");
    return out;
  },
});

// ── Client matters ───────────────────────────────────────────────────────

export const clientMatters = makeSoftCrud({
  table: LegalClientMatters,
  sequenceKey: "legal_client_matters",
  listKey: "matters",
  singularLabel: "Client matter",
  defaultSort: { openedAt: -1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.risk) q.risk = String(query.risk);
    applySearch(q, query, ["clientName", "matterTitle"]);
  },
  format: (doc) => ({
    id: doc.id,
    clientName: doc.clientName,
    matterTitle: doc.matterTitle,
    status: doc.status,
    risk: doc.risk,
    assignedTo: formatAssigned(doc),
    openedAt: toIso(doc.openedAt),
    contractValue: Number(doc.contractValue ?? 0),
  }),
  parseCreate: async (body) => ({
    clientName: requireText(body.clientName, "clientName"),
    matterTitle: requireText(body.matterTitle, "matterTitle"),
    status: body.status
      ? requireEnum(body.status, LEGAL_CLIENT_MATTER_STATUSES, "status")
      : "active",
    risk: body.risk ? requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk") : "medium",
    assignedTo: await resolveCounselSnapshot(body),
    openedAt: requireDate(body.openedAt ?? new Date().toISOString(), "openedAt"),
    contractValue: requireNumber(body.contractValue, "contractValue", { min: 0 }),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.clientName !== undefined) out.clientName = requireText(body.clientName, "clientName");
    if (body.matterTitle !== undefined) out.matterTitle = requireText(body.matterTitle, "matterTitle");
    if (body.status !== undefined) {
      out.status = requireEnum(body.status, LEGAL_CLIENT_MATTER_STATUSES, "status");
    }
    if (body.risk !== undefined) out.risk = requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk");
    if (body.assignedToId !== undefined || body.assignedTo !== undefined) {
      out.assignedTo = await resolveCounselSnapshot(body);
    }
    if (body.openedAt !== undefined) out.openedAt = requireDate(body.openedAt, "openedAt");
    if (body.contractValue !== undefined) {
      out.contractValue = requireNumber(body.contractValue, "contractValue", { min: 0 });
    }
    return out;
  },
});

// ── NDAs ─────────────────────────────────────────────────────────────────

export const ndas = makeSoftCrud({
  table: LegalNdaRecords,
  sequenceKey: "legal_nda_records",
  listKey: "ndas",
  singularLabel: "NDA",
  defaultSort: { expiresAt: 1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.partyType) q.partyType = String(query.partyType);
    if (query.risk) q.risk = String(query.risk);
    applySearch(q, query, ["partyName"]);
  },
  format: (doc) => ({
    id: doc.id,
    partyName: doc.partyName,
    partyType: doc.partyType,
    status: deriveNdaStatus(doc.status, doc.expiresAt),
    signedAt: toIso(doc.signedAt),
    expiresAt: toIso(doc.expiresAt),
    risk: doc.risk,
    assignedTo: formatAssigned(doc),
  }),
  parseCreate: async (body) => ({
    partyName: requireText(body.partyName, "partyName"),
    partyType: requireEnum(body.partyType, LEGAL_NDA_PARTY_TYPES, "partyType"),
    status: body.status ? requireEnum(body.status, LEGAL_NDA_STATUSES, "status") : "draft",
    signedAt: requireDate(body.signedAt, "signedAt", { required: false }),
    expiresAt: requireDate(body.expiresAt, "expiresAt"),
    risk: body.risk ? requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk") : "low",
    assignedTo: await resolveCounselSnapshot(body),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.partyName !== undefined) out.partyName = requireText(body.partyName, "partyName");
    if (body.partyType !== undefined) {
      out.partyType = requireEnum(body.partyType, LEGAL_NDA_PARTY_TYPES, "partyType");
    }
    if (body.status !== undefined) out.status = requireEnum(body.status, LEGAL_NDA_STATUSES, "status");
    if (body.signedAt !== undefined) {
      out.signedAt = requireDate(body.signedAt, "signedAt", { required: false });
    }
    if (body.expiresAt !== undefined) out.expiresAt = requireDate(body.expiresAt, "expiresAt");
    if (body.risk !== undefined) out.risk = requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk");
    if (body.assignedToId !== undefined || body.assignedTo !== undefined) {
      out.assignedTo = await resolveCounselSnapshot(body);
    }
    return out;
  },
});

// ── Agreements ───────────────────────────────────────────────────────────

export const agreements = makeSoftCrud({
  table: LegalAgreements,
  sequenceKey: "legal_agreements",
  listKey: "agreements",
  singularLabel: "Agreement",
  defaultSort: { renewalDate: 1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.type) q.type = String(query.type);
    if (query.risk) q.risk = String(query.risk);
    applySearch(q, query, ["title", "counterparty"]);
  },
  format: (doc) => ({
    id: doc.id,
    title: doc.title,
    counterparty: doc.counterparty,
    type: doc.type,
    status: deriveAgreementStatus(doc.status, doc.renewalDate),
    effectiveFrom: toIso(doc.effectiveFrom),
    renewalDate: toIso(doc.renewalDate),
    risk: doc.risk,
    assignedTo: formatAssigned(doc),
  }),
  parseCreate: async (body) => ({
    title: requireText(body.title, "title"),
    counterparty: requireText(body.counterparty, "counterparty"),
    type: requireEnum(body.type, LEGAL_AGREEMENT_TYPES, "type"),
    status: body.status
      ? requireEnum(body.status, LEGAL_AGREEMENT_STATUSES, "status")
      : "draft",
    effectiveFrom: requireDate(body.effectiveFrom, "effectiveFrom"),
    renewalDate: requireDate(body.renewalDate, "renewalDate"),
    risk: body.risk ? requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk") : "low",
    assignedTo: await resolveCounselSnapshot(body),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.title !== undefined) out.title = requireText(body.title, "title");
    if (body.counterparty !== undefined) {
      out.counterparty = requireText(body.counterparty, "counterparty");
    }
    if (body.type !== undefined) out.type = requireEnum(body.type, LEGAL_AGREEMENT_TYPES, "type");
    if (body.status !== undefined) {
      out.status = requireEnum(body.status, LEGAL_AGREEMENT_STATUSES, "status");
    }
    if (body.effectiveFrom !== undefined) {
      out.effectiveFrom = requireDate(body.effectiveFrom, "effectiveFrom");
    }
    if (body.renewalDate !== undefined) out.renewalDate = requireDate(body.renewalDate, "renewalDate");
    if (body.risk !== undefined) out.risk = requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk");
    if (body.assignedToId !== undefined || body.assignedTo !== undefined) {
      out.assignedTo = await resolveCounselSnapshot(body);
    }
    return out;
  },
});

// ── Notices ──────────────────────────────────────────────────────────────

export const notices = makeSoftCrud({
  table: LegalNotices,
  sequenceKey: "legal_notices",
  listKey: "notices",
  singularLabel: "Legal notice",
  defaultSort: { dueDate: 1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.direction) q.direction = String(query.direction);
    if (query.risk) q.risk = String(query.risk);
    applySearch(q, query, ["reference", "subject", "counterparty"]);
  },
  format: (doc) => ({
    id: doc.id,
    reference: doc.reference,
    direction: doc.direction,
    subject: doc.subject,
    counterparty: doc.counterparty,
    status: doc.status,
    risk: doc.risk,
    dueDate: toIso(doc.dueDate),
    assignedTo: formatAssigned(doc),
  }),
  parseCreate: async (body) => ({
    reference:
      optionalString(body.reference) || (await nextRefNumber("legal_notice_ref", "LN")),
    direction: requireEnum(body.direction, LEGAL_NOTICE_DIRECTIONS, "direction"),
    subject: requireText(body.subject, "subject"),
    counterparty: requireText(body.counterparty, "counterparty"),
    status: body.status ? requireEnum(body.status, LEGAL_NOTICE_STATUSES, "status") : "draft",
    risk: body.risk ? requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk") : "medium",
    dueDate: requireDate(body.dueDate, "dueDate"),
    assignedTo: await resolveCounselSnapshot(body),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.reference !== undefined) out.reference = requireText(body.reference, "reference");
    if (body.direction !== undefined) {
      out.direction = requireEnum(body.direction, LEGAL_NOTICE_DIRECTIONS, "direction");
    }
    if (body.subject !== undefined) out.subject = requireText(body.subject, "subject");
    if (body.counterparty !== undefined) {
      out.counterparty = requireText(body.counterparty, "counterparty");
    }
    if (body.status !== undefined) {
      out.status = requireEnum(body.status, LEGAL_NOTICE_STATUSES, "status");
    }
    if (body.risk !== undefined) out.risk = requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk");
    if (body.dueDate !== undefined) out.dueDate = requireDate(body.dueDate, "dueDate");
    if (body.assignedToId !== undefined || body.assignedTo !== undefined) {
      out.assignedTo = await resolveCounselSnapshot(body);
    }
    return out;
  },
});

// ── Court cases ──────────────────────────────────────────────────────────

export const courtCases = makeSoftCrud({
  table: LegalCourtCases,
  sequenceKey: "legal_court_cases",
  listKey: "courtCases",
  singularLabel: "Court case",
  defaultSort: { nextHearing: 1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.risk) q.risk = String(query.risk);
    applySearch(q, query, ["caseNumber", "court", "title"]);
  },
  format: (doc) => ({
    id: doc.id,
    caseNumber: doc.caseNumber,
    court: doc.court,
    title: doc.title,
    status: doc.status,
    risk: doc.risk,
    nextHearing: toIso(doc.nextHearing),
    assignedTo: formatAssigned(doc),
    openedAt: toIso(doc.openedAt),
  }),
  parseCreate: async (body) => ({
    caseNumber:
      optionalString(body.caseNumber) || (await nextRefNumber("legal_court_case_ref", "CC")),
    court: requireText(body.court, "court"),
    title: requireText(body.title, "title"),
    status: body.status
      ? requireEnum(body.status, LEGAL_COURT_CASE_STATUSES, "status")
      : "filed",
    risk: body.risk ? requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk") : "medium",
    nextHearing: requireDate(body.nextHearing, "nextHearing", { required: false }),
    assignedTo: await resolveCounselSnapshot(body),
    openedAt: requireDate(body.openedAt ?? new Date().toISOString(), "openedAt"),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.caseNumber !== undefined) out.caseNumber = requireText(body.caseNumber, "caseNumber");
    if (body.court !== undefined) out.court = requireText(body.court, "court");
    if (body.title !== undefined) out.title = requireText(body.title, "title");
    if (body.status !== undefined) {
      out.status = requireEnum(body.status, LEGAL_COURT_CASE_STATUSES, "status");
    }
    if (body.risk !== undefined) out.risk = requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk");
    if (body.nextHearing !== undefined) {
      out.nextHearing = requireDate(body.nextHearing, "nextHearing", { required: false });
    }
    if (body.assignedToId !== undefined || body.assignedTo !== undefined) {
      out.assignedTo = await resolveCounselSnapshot(body);
    }
    if (body.openedAt !== undefined) out.openedAt = requireDate(body.openedAt, "openedAt");
    return out;
  },
});

// ── Compliance ───────────────────────────────────────────────────────────

export const compliance = makeSoftCrud({
  table: LegalComplianceItems,
  sequenceKey: "legal_compliance_items",
  listKey: "items",
  singularLabel: "Compliance item",
  defaultSort: { nextReview: 1 },
  buildListQuery: (q, query) => {
    if (query.status) q.status = String(query.status);
    if (query.risk) q.risk = String(query.risk);
    if (query.framework) q.framework = String(query.framework);
    applySearch(q, query, ["framework", "requirement"]);
  },
  format: (doc) => ({
    id: doc.id,
    framework: doc.framework,
    requirement: doc.requirement,
    status: doc.status,
    risk: doc.risk,
    lastReview: toIso(doc.lastReview),
    nextReview: toIso(doc.nextReview),
    owner: formatCounsel(doc.owner),
  }),
  parseCreate: async (body) => ({
    framework: requireText(body.framework, "framework"),
    requirement: requireText(body.requirement, "requirement"),
    status: body.status
      ? requireEnum(body.status, LEGAL_COMPLIANCE_STATUSES, "status")
      : "review_pending",
    risk: body.risk ? requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk") : "medium",
    lastReview: requireDate(body.lastReview ?? new Date().toISOString(), "lastReview"),
    nextReview: requireDate(body.nextReview, "nextReview"),
    owner: await resolveCounselSnapshot(body, "ownerId"),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.framework !== undefined) out.framework = requireText(body.framework, "framework");
    if (body.requirement !== undefined) {
      out.requirement = requireText(body.requirement, "requirement");
    }
    if (body.status !== undefined) {
      out.status = requireEnum(body.status, LEGAL_COMPLIANCE_STATUSES, "status");
    }
    if (body.risk !== undefined) out.risk = requireEnum(body.risk, LEGAL_RISK_LEVELS, "risk");
    if (body.lastReview !== undefined) out.lastReview = requireDate(body.lastReview, "lastReview");
    if (body.nextReview !== undefined) out.nextReview = requireDate(body.nextReview, "nextReview");
    if (
      body.ownerId !== undefined ||
      body.owner !== undefined ||
      body.assignedToId !== undefined ||
      body.assignedTo !== undefined
    ) {
      out.owner = await resolveCounselSnapshot(body, "ownerId");
    }
    return out;
  },
});

// ── Expenses ─────────────────────────────────────────────────────────────

export const expenses = makeSoftCrud({
  table: LegalExpenses,
  sequenceKey: "legal_expenses",
  listKey: "expenses",
  singularLabel: "Legal expense",
  defaultSort: { date: -1 },
  buildListQuery: (q, query) => {
    if (query.category) q.category = String(query.category);
    applySearch(q, query, ["description", "matterRef", "approvedBy"]);
  },
  format: (doc) => ({
    id: doc.id,
    date: toIso(doc.date),
    category: doc.category,
    description: doc.description,
    amount: Number(doc.amount ?? 0),
    matterRef: doc.matterRef,
    approvedBy: doc.approvedBy,
    receiptAttached: Boolean(doc.receiptAttached),
  }),
  parseCreate: async (body) => ({
    date: requireDate(body.date ?? new Date().toISOString(), "date"),
    category: requireEnum(body.category, LEGAL_EXPENSE_CATEGORIES, "category"),
    description: requireText(body.description, "description"),
    amount: requireNumber(body.amount, "amount", { min: 0 }),
    matterRef: requireText(body.matterRef, "matterRef"),
    approvedBy: requireText(body.approvedBy, "approvedBy"),
    receiptAttached: requireBool(body.receiptAttached, "receiptAttached", {
      defaultValue: false,
    }),
  }),
  parsePatch: async (body) => {
    const out = {};
    if (body.date !== undefined) out.date = requireDate(body.date, "date");
    if (body.category !== undefined) {
      out.category = requireEnum(body.category, LEGAL_EXPENSE_CATEGORIES, "category");
    }
    if (body.description !== undefined) {
      out.description = requireText(body.description, "description");
    }
    if (body.amount !== undefined) out.amount = requireNumber(body.amount, "amount", { min: 0 });
    if (body.matterRef !== undefined) out.matterRef = requireText(body.matterRef, "matterRef");
    if (body.approvedBy !== undefined) out.approvedBy = requireText(body.approvedBy, "approvedBy");
    if (body.receiptAttached !== undefined) {
      out.receiptAttached = requireBool(body.receiptAttached, "receiptAttached");
    }
    return out;
  },
});
