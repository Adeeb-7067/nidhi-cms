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
import { escapeRegex } from "../../utils/regex.js";

async function listFollowUps(req, res) {
  const { leadId, status, executiveId, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (leadId) filter.leadId = Number(leadId);
  if (status) filter.status = status;
  if (executiveId) filter.executiveId = Number(executiveId);
  if (search?.trim()) {
    const re = { $regex: escapeRegex(search.trim()), $options: "i" };
    const matchingLeads = await SalesLeads.find({ $or: [{ name: re }, { company: re }] })
      .select({ id: 1 })
      .lean();
    const leadIds = matchingLeads.map((l) => l.id);
    filter.$or = [{ notes: re }, { leadId: { $in: leadIds } }];
  }
  // BDE scope: within a lead they own, show every follow-up on it;
  // otherwise (general list) restrict to follow-ups assigned to them.
  if (req.user.role === "bde") {
    if (leadId) {
      const lead = await SalesLeads.findOne({ id: Number(leadId) }).select({ assignedTo: 1, createdBy: 1 }).lean();
      if (!lead || (lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id)) {
        res.json({ followUps: [], total: 0, page, limit });
        return;
      }
    } else {
      filter.executiveId = req.user.id;
    }
  }
  // Auto-mark overdue on read — compare against start of today so date-only
  // follow-ups aren't immediately overdue the moment they're created.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  await SalesFollowUps.updateMany(
    { status: "scheduled", scheduledAt: { $lt: startOfToday } },
    { $set: { status: "overdue" } }
  );
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesFollowUps,
    filter,
    { page, limit, skip },
    { sort: { scheduledAt: 1 } }
  );

  const leadIds = [...new Set(items.map((f) => f.leadId).filter(Boolean))];
  const leads = leadIds.length
    ? await SalesLeads.find({ id: { $in: leadIds } }).select({ id: 1, name: 1, company: 1 }).lean()
    : [];
  const leadMap = new Map(leads.map((l) => [l.id, l]));
  const followUps = items.map((f) => ({
    ...f,
    leadName: leadMap.get(f.leadId)?.name ?? null,
    leadCompany: leadMap.get(f.leadId)?.company ?? null,
  }));

  res.json({ followUps, total, page: pg, limit: lim });
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

// A BDE has access if the follow-up is assigned to them directly, or if it
// hangs off a lead they own — matching the list-endpoint scope so a follow-up
// visible in a lead's tab is never a dead link when opened.
async function assertFollowUpAccess(followUp, user) {
  if (!followUp) notFound("Follow-up");
  if (user?.role !== "bde") return;
  if (followUp.executiveId === user.id) return;
  const lead = await SalesLeads.findOne({ id: followUp.leadId }).select({ assignedTo: 1, createdBy: 1 }).lean();
  if (lead && (lead.assignedTo === user.id || lead.createdBy === user.id)) return;
  notFound("Follow-up");
}

async function updateFollowUp(req, res) {
  const id = parseIdParam(req.params.id, "follow-up id");
  const followUp = await SalesFollowUps.findOne({ id }).lean();
  if (!followUp) notFound("Follow-up");
  await assertFollowUpAccess(followUp, req.user);
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
  await assertFollowUpAccess(followUp, req.user);
  await SalesFollowUps.updateOne({ id }, { $set: { status: "completed", completedAt: new Date() } });
  res.json({ success: true });
}

export { listFollowUps, createFollowUp, updateFollowUp, completeFollowUp };
