import crypto from "crypto";
import { proposalStatuses } from "../../models/schema/sales/proposals.js";
import {
  SalesProposals,
  SalesLeads,
  SalesLeadActivity,
  clientsTable,
  SalesProposalLogs,
  SalesProposalComments,
  companySettingsTable,
  usersTable,
  getNextSequence,
  leadNoFollowUpStatuses,
} from "../../models/schema/index.js";
import { SalesPreferences } from "../../models/schema/sales/preferences.js";
import { mergeDocumentBranding, publicProposalDocumentBranding } from "../../utils/sales-document-branding-defaults.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
  forbidden,
} from "../../utils/route-errors.js";
import { sendProposalEmail } from "../../lib/email.js";
import { logger } from "../../lib/logger.js";
import {
  calcLineItemsTotal,
  resolveFinalTotal,
  parseAdjustedTotal,
  parseTotalAdjustment,
} from "../../utils/sales-totals.js";
import { customerProposalOwnershipFilter } from "../../utils/sales-proposal-links.js";
import {
  canClientRespondToProposal,
  publicViewStatusUpdates,
  statusAfterValidityExtension,
} from "../../utils/sales-proposal-client.js";
import { clientAsProposalCustomer } from "../../mappers/client-customer-format.js";
import { assertBdeOwnsCustomerById, bdeOwnsCustomer } from "../../utils/sales-bde-customer-scope.js";

const STAFF_MUTABLE_PROPOSAL_STATUSES = ["sent", "seen", "revised", "counter_offer", "expired"];
const CLIENT_RESPONDABLE_STATUSES = ["sent", "seen", "revised", "counter_offer", "expired"];

// Keeps the lead pipeline in sync with a proposal's outcome — the lead schema has
// no decline/counter equivalent, so only the unambiguous "approved" case is synced.
async function markLeadApprovedFromProposal(leadId, actorId, proposalNumber) {
  if (!leadId) return;
  const result = await SalesLeads.updateOne(
    { id: leadId, status: { $nin: [...leadNoFollowUpStatuses, "approved"] } },
    { $set: { status: "approved" } }
  );
  if (result.modifiedCount > 0) {
    const actId = await getNextSequence("sales_lead_activity");
    await SalesLeadActivity.create({
      id: actId,
      leadId,
      type: "proposal_approved",
      description: `Lead marked approved — proposal ${proposalNumber} was accepted`,
      actorId: actorId ?? null,
      meta: { proposalNumber },
    });
  }
}

// A BDE has access if the proposal is assigned to them directly, or if it
// hangs off a lead/customer they own — matching the list-endpoint scope so a
// proposal visible in a lead/customer's tab is never a dead link when opened.
async function assertProposalAccess(proposal, user) {
  if (!proposal) notFound("Proposal");
  if (user?.role !== "bde") return;
  if (proposal.assignedTo === user.id) return;
  if (proposal.leadId) {
    const lead = await SalesLeads.findOne({ id: proposal.leadId }).select({ assignedTo: 1, createdBy: 1 }).lean();
    if (lead && (lead.assignedTo === user.id || lead.createdBy === user.id)) return;
  }
  if (proposal.customerId) {
    const customer = await clientsTable.findOne({ id: proposal.customerId }).select({ assignedAdminId: 1, createdBy: 1 }).lean();
    if (customer && bdeOwnsCustomer(customer, user.id)) return;
  }
  notFound("Proposal");
}

function getClientIp(req) {
  return (
    (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

async function appendLog(proposalId, event, req, extra = {}) {
  try {
    const logId = await getNextSequence("sales_proposal_logs");
    await SalesProposalLogs.create({
      id: logId,
      proposalId,
      event,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? null,
      ...extra,
    });
  } catch (err) {
    logger.warn({ err, proposalId, event }, "proposalLogs: failed to write audit entry");
  }
}

async function nextProposalNumber() {
  const year = new Date().getFullYear();
  const prefs = await SalesPreferences.findOneAndUpdate(
    { id: 1 },
    { $inc: { proposalNextNumber: 1 } },
    { upsert: true, new: false, setDefaultsOnInsert: true },
  ).lean();
  const prefix = prefs?.proposalPrefix ?? "PROP";
  const seq = prefs?.proposalNextNumber ?? 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

function parseProposalStatus(raw, fallback = "draft") {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const status = String(raw).trim();
  if (!proposalStatuses.includes(status)) {
    badRequest(`Invalid status. Allowed: ${proposalStatuses.join(", ")}`, "status");
  }
  return status;
}

function parseItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item, i) => ({
    itemId: String(item.itemId ?? i + 1),
    name: String(item.name ?? ""),
    description: String(item.description ?? ""),
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    taxPercent: Number(item.taxPercent ?? 18),
  }));
}

function calcTotal(items, discount, totalAdjustment = 0, adjustedTotal = null) {
  const calculated = calcLineItemsTotal(items, discount);
  return resolveFinalTotal(calculated, totalAdjustment, adjustedTotal);
}

async function listProposals(req, res) {
  const { status, assignedTo, leadId, customerId, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  const andClauses = [];
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = Number(assignedTo);
  if (leadId) filter.leadId = Number(leadId);
  let customerOwnedByBde = false;
  if (customerId && !leadId) {
    const cid = Number(customerId);
    const customer = await clientsTable.findOne({ id: cid }).select({ leadId: 1, assignedAdminId: 1, createdBy: 1 }).lean();
    andClauses.push(customerProposalOwnershipFilter(cid, customer?.leadId ?? null));
    if (req.user.role === "bde") {
      if (!customer || !bdeOwnsCustomer(customer, req.user.id)) {
        res.json({ proposals: [], total: 0, page, limit });
        return;
      }
      customerOwnedByBde = true;
    }
  }
  if (search) {
    const q = String(search).trim();
    if (q) {
      andClauses.push({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { number: { $regex: q, $options: "i" } },
        ],
      });
    }
  }
  if (andClauses.length === 1) Object.assign(filter, andClauses[0]);
  else if (andClauses.length > 1) filter.$and = andClauses;
  // BDE scope: within a lead/customer they own, show every proposal on it;
  // otherwise (general list) restrict to proposals assigned to them.
  if (req.user.role === "bde" && !customerOwnedByBde) {
    if (leadId) {
      const lead = await SalesLeads.findOne({ id: Number(leadId) }).select({ assignedTo: 1, createdBy: 1 }).lean();
      if (!lead || (lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id)) {
        res.json({ proposals: [], total: 0, page, limit });
        return;
      }
    } else {
      filter.assignedTo = req.user.id;
    }
  }
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesProposals,
    filter,
    { page, limit, skip },
    { sort: { createdAt: -1 } }
  );

  const assigneeIds = [...new Set(items.map((p) => p.assignedTo).filter(Boolean))];
  const leadIds = [...new Set(items.map((p) => p.leadId).filter(Boolean))];
  const customerIds = [...new Set(items.map((p) => p.customerId).filter(Boolean))];
  const [assignees, leads, customers] = await Promise.all([
    assigneeIds.length
      ? usersTable.find({ id: { $in: assigneeIds } }).select({ id: 1, name: 1, avatarUrl: 1 }).lean()
      : [],
    leadIds.length
      ? SalesLeads.find({ id: { $in: leadIds } }).select({ id: 1, name: 1, company: 1 }).lean()
      : [],
    customerIds.length
      ? clientsTable
          .find({ id: { $in: customerIds } })
          .select({ id: 1, companyName: 1, contactPerson: 1 })
          .lean()
          .then((rows) => rows.map(clientAsProposalCustomer))
      : [],
  ]);
  const assigneeMap = new Map(assignees.map((u) => [u.id, u]));
  const leadMap = new Map(leads.map((l) => [l.id, l]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const proposals = items.map((p) => ({
    ...p,
    assignedToUser: p.assignedTo ? assigneeMap.get(p.assignedTo) ?? null : null,
    lead: p.leadId ? leadMap.get(p.leadId) ?? { id: p.leadId } : null,
    customer: p.customerId ? customerMap.get(p.customerId) ?? { id: p.customerId } : null,
  }));

  res.json({ proposals, total, page: pg, limit: lim });
}

async function createProposal(req, res) {
  const body = req.body;
  const title = optionalString(body.title);
  if (!title) badRequest("Title is required.", "title");
  if (body.leadId) {
    const lead = await SalesLeads.findOne({ id: Number(body.leadId) }).lean();
    if (!lead) badRequest("leadId references a non-existent lead.", "leadId");
    if (req.user.role === "bde" && lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id) {
      notFound("Lead");
    }
    if (leadNoFollowUpStatuses.includes(lead.status)) {
      badRequest(
        lead.status === "closed_elsewhere"
          ? "This lead closed a deal elsewhere — reopen outreach before creating a proposal."
          : "Cannot create a proposal for this lead status.",
        "status"
      );
    }
  }
  if (body.customerId) {
    await assertBdeOwnsCustomerById(clientsTable, req.user, body.customerId);
    const client = await clientsTable.findOne({ id: Number(body.customerId) }).lean();
    if (!client) notFound("Customer");
  }
  const [number, id] = await Promise.all([
    nextProposalNumber(),
    getNextSequence("sales_proposals"),
  ]);
  const viewToken = crypto.randomBytes(32).toString("hex");
  const proposal = await SalesProposals.create({
    id,
    number,
    title,
    leadId: body.leadId ? Number(body.leadId) : null,
    customerId: body.customerId ? Number(body.customerId) : null,
    assignedTo: req.user.role === "bde"
      ? req.user.id
      : (body.assignedTo ? Number(body.assignedTo) : req.user.id),
    status: parseProposalStatus(body.status, "draft"),
    items: parseItems(body.items),
    discount: Number(body.discount) || 0,
    totalAdjustment: parseTotalAdjustment(body.totalAdjustment) ?? 0,
    adjustedTotal: parseAdjustedTotal(body.adjustedTotal) ?? null,
    validUntil: body.validUntil ? new Date(body.validUntil) : null,
    clientNote: optionalString(body.clientNote) ?? "",
    terms: optionalString(body.terms) ?? "",
    internalNotes: optionalString(body.internalNotes) ?? "",
    revision: 1,
    viewToken,
  });
  if (proposal.leadId) {
    await SalesLeads.updateOne(
      { id: proposal.leadId, status: { $nin: leadNoFollowUpStatuses } },
      { $set: { proposalId: id, status: "proposal_sent" } }
    );
    const actId = await getNextSequence("sales_lead_activity");
    await SalesLeadActivity.create({
      id: actId,
      leadId: proposal.leadId,
      type: "proposal_created",
      description: `Proposal ${number} created`,
      actorId: req.user.id,
      meta: { proposalId: id, number },
    });
  }
  res.status(201).json(proposal.toObject());
}

async function getProposalById(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  let proposal = await SalesProposals.findOne({ id }).lean();
  if (!proposal) notFound("Proposal");
  await assertProposalAccess(proposal, req.user);

  // Back-fill viewToken for proposals created before the field was added
  if (!proposal.viewToken) {
    const viewToken = crypto.randomBytes(32).toString("hex");
    await SalesProposals.updateOne({ id }, { $set: { viewToken } });
    proposal = { ...proposal, viewToken };
  }

  const [assignedUser, lead, customer] = await Promise.all([
    proposal.assignedTo
      ? usersTable.findOne({ id: proposal.assignedTo }).select({ id: 1, name: 1, avatarUrl: 1 }).lean()
      : null,
    proposal.leadId
      ? SalesLeads.findOne({ id: proposal.leadId }).select({ id: 1, name: 1, email: 1, phone: 1, company: 1, status: 1 }).lean()
      : null,
    proposal.customerId
      ? clientsTable.findOne({ id: proposal.customerId }).select({ id: 1, companyName: 1, contactPerson: 1, email: 1, phone: 1, address: 1, gstNumber: 1 }).lean().then(clientAsProposalCustomer)
      : null,
  ]);

  res.json({ ...proposal, assignedToUser: assignedUser, lead, customer });
}

async function updateProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const proposal = await SalesProposals.findOne({ id }).lean();
  if (!proposal) notFound("Proposal");
  await assertProposalAccess(proposal, req.user);
  const body = req.body;
  const updates = {};
  if (body.title !== undefined) updates.title = optionalString(body.title);
  if (body.items !== undefined) updates.items = parseItems(body.items);
  if (body.discount !== undefined) updates.discount = Number(body.discount) || 0;
  if (body.totalAdjustment !== undefined) {
    updates.totalAdjustment = parseTotalAdjustment(body.totalAdjustment);
  }
  if (body.adjustedTotal !== undefined) {
    updates.adjustedTotal = parseAdjustedTotal(body.adjustedTotal);
  }
  if (body.validUntil !== undefined) {
    updates.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    const reopened = statusAfterValidityExtension(proposal, updates.validUntil);
    if (reopened) updates.status = reopened;
  }
  if (body.clientNote !== undefined) updates.clientNote = optionalString(body.clientNote) ?? "";
  if (body.terms !== undefined) updates.terms = optionalString(body.terms) ?? "";
  if (body.internalNotes !== undefined) updates.internalNotes = optionalString(body.internalNotes) ?? "";
  if (body.assignedTo !== undefined) {
    if (req.user.role === "bde") {
      const nextAssignee = body.assignedTo ? Number(body.assignedTo) : null;
      if (nextAssignee != null && nextAssignee !== req.user.id) {
        forbidden("BDE cannot reassign proposals to other executives.");
      }
    } else {
      updates.assignedTo = body.assignedTo ? Number(body.assignedTo) : null;
    }
  }
  if (body.projectId !== undefined) updates.projectId = body.projectId ? Number(body.projectId) : null;
  if (body.status !== undefined) updates.status = parseProposalStatus(body.status);
  const updated = await SalesProposals.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function sendProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");

  // Ensure viewToken exists before sending (back-fill for old proposals)
  const pre = await SalesProposals.findOne({ id }).lean();
  if (!pre) notFound("Proposal");
  await assertProposalAccess(pre, req.user);
  if (pre.leadId) {
    const lead = await SalesLeads.findOne({ id: pre.leadId }).select({ status: 1 }).lean();
    if (lead && leadNoFollowUpStatuses.includes(lead.status)) {
      badRequest(
        lead.status === "closed_elsewhere"
          ? "This lead closed a deal elsewhere — reopen outreach before sending a proposal."
          : "Cannot send a proposal for this lead status.",
        "status"
      );
    }
  }
  if (!pre.viewToken) {
    await SalesProposals.updateOne({ id }, { $set: { viewToken: crypto.randomBytes(32).toString("hex") } });
  }

  const updated = await SalesProposals.findOneAndUpdate(
    { id, status: { $in: ["draft", "revised", "counter_offer", "sent", "seen", "expired"] } },
    { $set: { status: "sent", sentAt: new Date() } },
    { new: true }
  ).lean();
  if (!updated) {
    if (!["draft", "revised", "counter_offer", "sent", "seen", "expired"].includes(pre.status)) {
      badRequest("This proposal cannot be sent in its current state.", "status");
    }
    notFound("Proposal");
  }

  let emailSent = false;
  let sentToEmail = null;
  try {
    let recipientEmail = null;
    let recipientName = "there";
    if (updated.leadId) {
      const lead = await SalesLeads.findOne({ id: updated.leadId }).select({ email: 1, name: 1 }).lean();
      if (lead?.email) { recipientEmail = lead.email; recipientName = lead.name; sentToEmail = lead.email; }
    } else if (updated.customerId) {
      const customer = await clientsTable.findOne({ id: updated.customerId }).select({ email: 1, contactPerson: 1 }).lean();
      if (customer?.email) { recipientEmail = customer.email; recipientName = customer.contactPerson; sentToEmail = customer.email; }
    }
    if (recipientEmail) {
      const appUrl = (process.env.APP_URL ?? "http://localhost:5173").replace(/\/$/, "");
      const viewUrl = `${appUrl}/proposal/${updated.id}/${updated.viewToken}`;
      const total = calcTotal(
        updated.items,
        updated.discount,
        updated.totalAdjustment,
        updated.adjustedTotal
      );
      const validUntil = updated.validUntil
        ? new Date(updated.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        : null;
      const result = await sendProposalEmail({
        to: recipientEmail,
        recipientName,
        proposalNumber: updated.number,
        proposalTitle: updated.title,
        totalAmount: total,
        validUntil,
        viewUrl,
      });
      emailSent = result.sent;
    }
  } catch (err) {
    logger.warn({ err, proposalId: id }, "sendProposal: email delivery failed");
  }

  res.json({ ...updated, emailSent, sentToEmail });
}

async function approveProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const existing = await SalesProposals.findOne({ id }).lean();
  if (!existing) notFound("Proposal");
  await assertProposalAccess(existing, req.user);
  const updated = await SalesProposals.findOneAndUpdate(
    { id, status: { $in: STAFF_MUTABLE_PROPOSAL_STATUSES } },
    { $set: { status: "approved", approvedAt: new Date() } },
    { new: true }
  ).lean();
  if (!updated) {
    badRequest("This proposal cannot be approved in its current state.", "status");
  }
  await markLeadApprovedFromProposal(updated.leadId, req.user.id, updated.number);
  res.json(updated);
}

async function declineProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const existing = await SalesProposals.findOne({ id }).lean();
  if (!existing) notFound("Proposal");
  await assertProposalAccess(existing, req.user);
  const reason = optionalString(req.body.reason) ?? null;
  const updated = await SalesProposals.findOneAndUpdate(
    { id, status: { $in: STAFF_MUTABLE_PROPOSAL_STATUSES } },
    { $set: { status: "declined", declinedAt: new Date(), declinedReason: reason } },
    { new: true }
  ).lean();
  if (!updated) {
    badRequest("This proposal cannot be declined in its current state.", "status");
  }
  res.json(updated);
}

async function counterProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const existing = await SalesProposals.findOne({ id }).lean();
  if (!existing) notFound("Proposal");
  await assertProposalAccess(existing, req.user);
  const note = optionalString(req.body.note) ?? null;
  const updated = await SalesProposals.findOneAndUpdate(
    { id, status: { $in: STAFF_MUTABLE_PROPOSAL_STATUSES } },
    { $set: { status: "counter_offer", counterOfferNote: note } },
    { new: true }
  ).lean();
  if (!updated) {
    badRequest("This proposal cannot be updated in its current state.", "status");
  }
  res.json(updated);
}

async function reviseProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const existing = await SalesProposals.findOne({ id }).lean();
  if (!existing) notFound("Proposal");
  await assertProposalAccess(existing, req.user);
  const updated = await SalesProposals.findOneAndUpdate(
    { id, status: { $in: ["declined", "counter_offer", "expired"] } },
    { $set: { status: "revised" }, $inc: { revision: 1 } },
    { new: true }
  ).lean();
  if (!updated) {
    badRequest("This proposal cannot be revised in its current state.", "status");
  }
  res.json(updated);
}

async function deleteProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const proposal = await SalesProposals.findOne({ id }).lean();
  if (!proposal) notFound("Proposal");
  await assertProposalAccess(proposal, req.user);
  if (!["draft", "revised", "declined", "expired"].includes(proposal.status)) {
    badRequest("Only draft, revised, declined, or expired proposals can be deleted.", "status");
  }
  await SalesProposals.deleteOne({ id });
  await SalesProposalLogs.deleteMany({ proposalId: id });
  // Unlink from lead if present
  if (proposal.leadId) {
    await SalesLeads.updateOne(
      { id: proposal.leadId, proposalId: id },
      { $set: { proposalId: null } }
    );
  }
  res.json({ deleted: true, id });
}

// ─── Public endpoints (no auth) ───────────────────────────────────────────────

// GET /sales/proposals/view/:token — mark as seen on first view, log every view
async function viewProposal(req, res) {
  const { token } = req.params;
  if (!token || token.length < 32) badRequest("Invalid link.");
  const proposal = await SalesProposals.findOne({ viewToken: token }).lean();
  if (!proposal) notFound("Proposal");

  const viewUpdates = publicViewStatusUpdates(proposal);
  if (Object.keys(viewUpdates).length > 0) {
    await SalesProposals.updateOne({ viewToken: token }, { $set: viewUpdates });
    Object.assign(proposal, viewUpdates);
  }

  // Log every view with IP
  await appendLog(proposal.id, "viewed", req);

  // Populate lead/customer for client display
  const [lead, customer, settings, salesPrefs] = await Promise.all([
    proposal.leadId
      ? SalesLeads.findOne({ id: proposal.leadId }).select({ id: 1, name: 1, email: 1, phone: 1, company: 1, address: 1, status: 1 }).lean()
      : null,
    proposal.customerId
      ? clientsTable.findOne({ id: proposal.customerId }).select({ id: 1, companyName: 1, contactPerson: 1, email: 1, phone: 1, address: 1, gstNumber: 1 }).lean().then(clientAsProposalCustomer)
      : null,
    companySettingsTable.findOne({}).select({ companyName: 1, logoUrl: 1, sealUrl: 1, address: 1 }).lean(),
    SalesPreferences.findOne({ id: 1 }).select({ documentBranding: 1 }).lean(),
  ]);

  const { viewToken, internalNotes, ...clientPayload } = proposal;
  res.json({
    ...clientPayload,
    lead: lead ?? null,
    customer: customer ?? null,
    companySettings: settings
      ? { companyName: settings.companyName, logoUrl: settings.logoUrl ?? null, sealUrl: settings.sealUrl ?? null, address: settings.address ?? null }
      : null,
    documentBranding: publicProposalDocumentBranding(salesPrefs?.documentBranding),
  });
}

// POST /sales/proposals/public/:token/approve — client accepts
async function publicApproveProposal(req, res) {
  const { token } = req.params;
  if (!token || token.length < 32) badRequest("Invalid link.");
  const proposal = await SalesProposals.findOne({ viewToken: token }).lean();
  if (!proposal) notFound("Proposal");
  if (!canClientRespondToProposal(proposal)) {
    badRequest("This proposal cannot be accepted in its current state.", "status");
  }
  const approvalNote = optionalString(req.body.note) ?? null;
  const clientSignature = optionalString(req.body.signature) ?? null;
  const updated = await SalesProposals.findOneAndUpdate(
    { viewToken: token, status: { $in: CLIENT_RESPONDABLE_STATUSES } },
    { $set: { status: "approved", approvedAt: new Date(), approvalNote, clientSignature } },
    { new: true }
  ).lean();
  if (!updated) {
    badRequest("This proposal cannot be accepted in its current state.", "status");
  }
  await appendLog(proposal.id, "approved", req);
  await markLeadApprovedFromProposal(updated.leadId, null, updated.number);
  const { viewToken: vt, internalNotes, ...clientPayload } = updated;
  res.json(clientPayload);
}

// POST /sales/proposals/public/:token/decline — client declines with reason
async function publicDeclineProposal(req, res) {
  const { token } = req.params;
  if (!token || token.length < 32) badRequest("Invalid link.");
  const proposal = await SalesProposals.findOne({ viewToken: token }).lean();
  if (!proposal) notFound("Proposal");
  if (!canClientRespondToProposal(proposal)) {
    badRequest("This proposal cannot be declined in its current state.", "status");
  }
  const reason = optionalString(req.body.reason) ?? null;
  const updated = await SalesProposals.findOneAndUpdate(
    { viewToken: token, status: { $in: CLIENT_RESPONDABLE_STATUSES } },
    { $set: { status: "declined", declinedAt: new Date(), declinedReason: reason } },
    { new: true }
  ).lean();
  if (!updated) {
    badRequest("This proposal cannot be declined in its current state.", "status");
  }
  await appendLog(proposal.id, "declined", req, { reason });
  const { viewToken: vt, internalNotes, ...clientPayload } = updated;
  res.json(clientPayload);
}

// POST /sales/proposals/public/:token/counter — client sends counter offer
async function publicCounterProposal(req, res) {
  const { token } = req.params;
  if (!token || token.length < 32) badRequest("Invalid link.");
  const proposal = await SalesProposals.findOne({ viewToken: token }).lean();
  if (!proposal) notFound("Proposal");
  if (!canClientRespondToProposal(proposal)) {
    badRequest("This proposal cannot receive a counter offer in its current state.", "status");
  }
  const note = optionalString(req.body.note) ?? null;
  const updated = await SalesProposals.findOneAndUpdate(
    { viewToken: token, status: { $in: CLIENT_RESPONDABLE_STATUSES } },
    { $set: { status: "counter_offer", counterOfferNote: note } },
    { new: true }
  ).lean();
  if (!updated) {
    badRequest("This proposal cannot receive a counter offer in its current state.", "status");
  }
  await appendLog(proposal.id, "counter_offer", req, { note });
  const { viewToken: vt, internalNotes, ...clientPayload } = updated;
  res.json(clientPayload);
}

// GET /sales/proposals/:id/logs — authenticated, returns full audit trail
async function getProposalLogs(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const proposal = await SalesProposals.findOne({ id }).lean();
  if (!proposal) notFound("Proposal");
  await assertProposalAccess(proposal, req.user);
  const logs = await SalesProposalLogs.find({ proposalId: id })
    .sort({ createdAt: 1 })
    .lean();
  res.json({ logs });
}

// ─── Discussion / Comments ─────────────────────────────────────────────────────

// GET /sales/proposals/public/:token/comments — public, returns comment thread
async function listPublicComments(req, res) {
  const { token } = req.params;
  if (!token || token.length < 32) badRequest("Invalid link.");
  const proposal = await SalesProposals.findOne({ viewToken: token }, { id: 1 }).lean();
  if (!proposal) notFound("Proposal");
  const comments = await SalesProposalComments.find({ proposalId: proposal.id })
    .sort({ createdAt: 1 })
    .lean();
  res.json({ comments });
}

// POST /sales/proposals/public/:token/comments — client posts a comment
async function addPublicComment(req, res) {
  const { token } = req.params;
  if (!token || token.length < 32) badRequest("Invalid link.");
  const content = optionalString(req.body.content);
  if (!content?.trim()) badRequest("Comment content is required.", "content");
  const authorName = optionalString(req.body.authorName) || "Customer";
  const proposal = await SalesProposals.findOne({ viewToken: token }, { id: 1 }).lean();
  if (!proposal) notFound("Proposal");
  const id = await getNextSequence("sales_proposal_comments");
  const comment = await SalesProposalComments.create({
    id,
    proposalId: proposal.id,
    authorName,
    authorType: "client",
    authorId: null,
    content: content.trim(),
  });
  res.status(201).json(comment.toObject());
}

// GET /sales/proposals/:id/comments — authenticated, staff reads discussion
async function listProposalComments(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const proposal = await SalesProposals.findOne({ id }).lean();
  if (!proposal) notFound("Proposal");
  await assertProposalAccess(proposal, req.user);
  const comments = await SalesProposalComments.find({ proposalId: id })
    .sort({ createdAt: 1 })
    .lean();
  res.json({ comments });
}

// POST /sales/proposals/:id/comments — authenticated, staff posts a reply
async function addStaffComment(req, res) {
  const proposalId = parseIdParam(req.params.id, "proposal id");
  const content = optionalString(req.body.content);
  if (!content?.trim()) badRequest("Comment content is required.", "content");
  const proposal = await SalesProposals.findOne({ id: proposalId }).lean();
  if (!proposal) notFound("Proposal");
  await assertProposalAccess(proposal, req.user);
  const staffUser = await usersTable.findOne({ id: req.user.id }, { name: 1 }).lean();
  const id = await getNextSequence("sales_proposal_comments");
  const comment = await SalesProposalComments.create({
    id,
    proposalId,
    authorName: staffUser?.name ?? "Sales Team",
    authorType: "staff",
    authorId: req.user.id,
    content: content.trim(),
  });
  res.status(201).json(comment.toObject());
}

export {
  listProposals,
  createProposal,
  getProposalById,
  updateProposal,
  deleteProposal,
  sendProposal,
  approveProposal,
  declineProposal,
  counterProposal,
  reviseProposal,
  viewProposal,
  publicApproveProposal,
  publicDeclineProposal,
  publicCounterProposal,
  getProposalLogs,
  listPublicComments,
  addPublicComment,
  listProposalComments,
  addStaffComment,
};
