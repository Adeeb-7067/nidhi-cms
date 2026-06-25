import crypto from "crypto";
import {
  SalesProposals,
  SalesLeads,
  SalesLeadActivity,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";

async function nextProposalNumber() {
  const year = new Date().getFullYear();
  const count = await SalesProposals.countDocuments({ number: { $regex: `^PROP-${year}-` } });
  return `PROP-${year}-${String(count + 1).padStart(4, "0")}`;
}

function parseItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item, i) => ({
    itemId: String(item.itemId ?? i + 1),
    description: String(item.description ?? ""),
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    taxPercent: Number(item.taxPercent ?? 18),
  }));
}

async function listProposals(req, res) {
  const { status, assignedTo, leadId, customerId } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = Number(assignedTo);
  if (leadId) filter.leadId = Number(leadId);
  if (customerId) filter.customerId = Number(customerId);
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesProposals,
    filter,
    { page, limit, skip },
    { sort: { createdAt: -1 } }
  );
  res.json({ proposals: items, total, page: pg, limit: lim });
}

async function createProposal(req, res) {
  const body = req.body;
  const title = optionalString(body.title);
  if (!title) badRequest("Title is required.", "title");
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
    assignedTo: body.assignedTo ? Number(body.assignedTo) : req.user.id,
    status: "draft",
    items: parseItems(body.items),
    discount: Number(body.discount) || 0,
    validUntil: body.validUntil ? new Date(body.validUntil) : null,
    clientNote: optionalString(body.clientNote) ?? "",
    terms: optionalString(body.terms) ?? "",
    internalNotes: optionalString(body.internalNotes) ?? "",
    revision: 1,
    viewToken,
  });
  if (proposal.leadId) {
    await SalesLeads.updateOne(
      { id: proposal.leadId },
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
  const proposal = await SalesProposals.findOne({ id }).lean();
  if (!proposal) notFound("Proposal");
  const assignedUser = proposal.assignedTo
    ? await usersTable.findOne({ id: proposal.assignedTo }).select({ id: 1, name: 1, avatarUrl: 1 }).lean()
    : null;
  res.json({ ...proposal, assignedToUser: assignedUser });
}

async function updateProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const proposal = await SalesProposals.findOne({ id }).lean();
  if (!proposal) notFound("Proposal");
  const body = req.body;
  const updates = {};
  if (body.title !== undefined) updates.title = optionalString(body.title);
  if (body.items !== undefined) updates.items = parseItems(body.items);
  if (body.discount !== undefined) updates.discount = Number(body.discount) || 0;
  if (body.validUntil !== undefined) updates.validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (body.clientNote !== undefined) updates.clientNote = optionalString(body.clientNote) ?? "";
  if (body.terms !== undefined) updates.terms = optionalString(body.terms) ?? "";
  if (body.internalNotes !== undefined) updates.internalNotes = optionalString(body.internalNotes) ?? "";
  if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo ? Number(body.assignedTo) : null;
  if (body.projectId !== undefined) updates.projectId = body.projectId ? Number(body.projectId) : null;
  const updated = await SalesProposals.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function sendProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const updated = await SalesProposals.findOneAndUpdate(
    { id },
    { $set: { status: "sent", sentAt: new Date() } },
    { new: true }
  ).lean();
  if (!updated) notFound("Proposal");
  res.json(updated);
}

async function approveProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const updated = await SalesProposals.findOneAndUpdate(
    { id },
    { $set: { status: "approved", approvedAt: new Date() } },
    { new: true }
  ).lean();
  if (!updated) notFound("Proposal");
  res.json(updated);
}

async function declineProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const reason = optionalString(req.body.reason) ?? null;
  const updated = await SalesProposals.findOneAndUpdate(
    { id },
    { $set: { status: "declined", declinedAt: new Date(), declinedReason: reason } },
    { new: true }
  ).lean();
  if (!updated) notFound("Proposal");
  res.json(updated);
}

async function counterProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const note = optionalString(req.body.note) ?? null;
  const updated = await SalesProposals.findOneAndUpdate(
    { id },
    { $set: { status: "counter_offer", counterOfferNote: note } },
    { new: true }
  ).lean();
  if (!updated) notFound("Proposal");
  res.json(updated);
}

async function reviseProposal(req, res) {
  const id = parseIdParam(req.params.id, "proposal id");
  const existing = await SalesProposals.findOne({ id }).lean();
  if (!existing) notFound("Proposal");
  const updated = await SalesProposals.findOneAndUpdate(
    { id },
    { $set: { status: "revised" }, $inc: { revision: 1 } },
    { new: true }
  ).lean();
  res.json(updated);
}

// Public — no auth required. Marks the proposal as seen on first view.
async function viewProposal(req, res) {
  const { token } = req.params;
  if (!token || token.length < 32) badRequest("Invalid link.");
  const proposal = await SalesProposals.findOne({ viewToken: token }).lean();
  if (!proposal) notFound("Proposal");
  if (!proposal.seenAt) {
    const newStatus = proposal.status === "sent" ? "seen" : proposal.status;
    await SalesProposals.updateOne(
      { viewToken: token },
      { $set: { seenAt: new Date(), status: newStatus } }
    );
    proposal.seenAt = new Date();
    proposal.status = newStatus;
  }
  // Strip internal fields before returning to client
  const { viewToken, internalNotes, ...clientPayload } = proposal;
  res.json(clientPayload);
}

export {
  listProposals,
  createProposal,
  getProposalById,
  updateProposal,
  sendProposal,
  approveProposal,
  declineProposal,
  counterProposal,
  reviseProposal,
  viewProposal,
};
