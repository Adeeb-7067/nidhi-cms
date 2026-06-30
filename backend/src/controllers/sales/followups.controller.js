import {
  SalesFollowUps,
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

async function listFollowUps(req, res) {
  const { leadId, status, executiveId } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (leadId) filter.leadId = Number(leadId);
  if (status) filter.status = status;
  if (executiveId) filter.executiveId = Number(executiveId);
  // BDE scope: only see their own follow-ups
  if (req.user.role === "bde") {
    filter.executiveId = req.user.id;
  }
  // Auto-mark overdue on read — bulk op is fast and keeps status accurate
  const now = new Date();
  await SalesFollowUps.updateMany(
    { status: "scheduled", scheduledAt: { $lt: now } },
    { $set: { status: "overdue" } }
  );
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesFollowUps,
    filter,
    { page, limit, skip },
    { sort: { scheduledAt: 1 } }
  );
  res.json({ followUps: items, total, page: pg, limit: lim });
}

async function createFollowUp(req, res) {
  const body = req.body;
  if (!body.leadId) badRequest("leadId is required.", "leadId");
  if (!body.type) badRequest("type is required.", "type");
  if (!body.scheduledAt) badRequest("scheduledAt is required.", "scheduledAt");
  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime())) badRequest("scheduledAt is invalid.", "scheduledAt");
  const lead = await SalesLeads.findOne({ id: Number(body.leadId) }).lean();
  if (!lead) notFound("Lead");
  const id = await getNextSequence("sales_followups");
  const followUp = await SalesFollowUps.create({
    id,
    leadId: Number(body.leadId),
    type: body.type,
    status: "scheduled",
    scheduledAt,
    notes: optionalString(body.notes) ?? "",
    executiveId: req.user.role === "bde" ? req.user.id : (body.executiveId ? Number(body.executiveId) : req.user.id),
  });
  const actId = await getNextSequence("sales_lead_activity");
  await SalesLeadActivity.create({
    id: actId,
    leadId: Number(body.leadId),
    type: "follow_up_scheduled",
    description: `Follow-up (${body.type}) scheduled for ${scheduledAt.toDateString()}`,
    actorId: req.user.id,
    meta: { followUpId: id, type: body.type },
  });
  res.status(201).json(followUp.toObject());
}

async function updateFollowUp(req, res) {
  const id = parseIdParam(req.params.id, "follow-up id");
  const followUp = await SalesFollowUps.findOne({ id }).lean();
  if (!followUp) notFound("Follow-up");
  if (req.user.role === "bde" && followUp.executiveId !== req.user.id) {
    notFound("Follow-up");
  }
  const body = req.body;
  const updates = {};
  if (body.type !== undefined) updates.type = body.type;
  if (body.status !== undefined) updates.status = body.status;
  if (body.scheduledAt !== undefined) {
    const d = new Date(body.scheduledAt);
    if (isNaN(d.getTime())) badRequest("scheduledAt is invalid.", "scheduledAt");
    updates.scheduledAt = d;
  }
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? "";
  // BDE cannot reassign a follow-up to another executive
  if (body.executiveId !== undefined && req.user.role !== "bde") {
    updates.executiveId = body.executiveId ? Number(body.executiveId) : null;
  }
  const updated = await SalesFollowUps.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function completeFollowUp(req, res) {
  const id = parseIdParam(req.params.id, "follow-up id");
  const followUp = await SalesFollowUps.findOne({ id }).lean();
  if (!followUp) notFound("Follow-up");
  if (req.user.role === "bde" && followUp.executiveId !== req.user.id) {
    notFound("Follow-up");
  }
  await SalesFollowUps.updateOne({ id }, { $set: { status: "completed", completedAt: new Date() } });
  res.json({ success: true });
}

export { listFollowUps, createFollowUp, updateFollowUp, completeFollowUp };
