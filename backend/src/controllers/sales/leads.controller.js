import {
  SalesLeads,
  SalesLeadActivity,
  SalesFollowUps,
  SalesCustomers,
  clientsTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { createClientPortalUser } from "../../services/client-portal.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";

async function logActivity(leadId, actorId, type, description, meta = {}) {
  const id = await getNextSequence("sales_lead_activity");
  await SalesLeadActivity.create({ id, leadId, type, description, actorId, meta });
}

async function hydrateAssignees(leads) {
  const userIds = [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))];
  if (!userIds.length) return leads.map((l) => ({ ...l, assignedToUser: null }));
  const users = await usersTable
    .find({ id: { $in: userIds } })
    .select({ id: 1, name: 1, avatarUrl: 1 })
    .lean();
  const map = new Map(users.map((u) => [u.id, u]));
  return leads.map((l) => ({ ...l, assignedToUser: l.assignedTo ? (map.get(l.assignedTo) ?? null) : null }));
}

async function listLeads(req, res) {
  const { status, assignedTo, priority, source, channel, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = Number(assignedTo);
  if (priority) filter.priority = priority;
  if (source) filter.source = source;
  if (channel) filter.contactChannel = channel;
  if (search?.trim()) {
    const re = { $regex: search.trim(), $options: "i" };
    filter.$or = [{ name: re }, { company: re }, { email: re }, { phone: re }];
  }
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesLeads,
    filter,
    { page, limit, skip },
    { sort: { createdAt: -1 } }
  );
  const leads = await hydrateAssignees(items);
  res.json({ leads, total, page: pg, limit: lim });
}

async function createLead(req, res) {
  const body = req.body;
  const name = optionalString(body.name);
  if (!name) badRequest("Name is required.", "name");
  const id = await getNextSequence("sales_leads");
  const lead = await SalesLeads.create({
    id,
    name,
    email: optionalString(body.email)?.toLowerCase() ?? null,
    phone: optionalString(body.phone) ?? null,
    company: optionalString(body.company) ?? null,
    address: optionalString(body.address) ?? null,
    position: optionalString(body.position) ?? null,
    source: optionalString(body.source) ?? null,
    contactChannel: optionalString(body.contactChannel) ?? null,
    status: optionalString(body.status) ?? "new",
    priority: optionalString(body.priority) ?? "medium",
    assignedTo: body.assignedTo ? Number(body.assignedTo) : null,
    expectedValue: Number(body.expectedValue) || 0,
    description: optionalString(body.description) ?? null,
    tags: Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string") : [],
    createdBy: req.user.id,
  });
  await logActivity(id, req.user.id, "created", `Lead created by ${req.user.name}`);
  res.status(201).json(lead.toObject());
}

async function getLeadById(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const lead = await SalesLeads.findOne({ id }).lean();
  if (!lead) notFound("Lead");
  const [activities, followUps, assignedUser] = await Promise.all([
    SalesLeadActivity.find({ leadId: id }).sort({ createdAt: -1 }).limit(50).lean(),
    SalesFollowUps.find({ leadId: id }).sort({ scheduledAt: 1 }).lean(),
    lead.assignedTo
      ? usersTable.findOne({ id: lead.assignedTo }).select({ id: 1, name: 1, avatarUrl: 1 }).lean()
      : null,
  ]);
  res.json({ ...lead, activities, followUps, assignedToUser: assignedUser });
}

async function updateLead(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const existing = await SalesLeads.findOne({ id }).lean();
  if (!existing) notFound("Lead");
  const body = req.body;
  const updates = {};
  if (body.name !== undefined) updates.name = optionalString(body.name);
  if (body.email !== undefined) updates.email = optionalString(body.email)?.toLowerCase() ?? null;
  if (body.phone !== undefined) updates.phone = optionalString(body.phone) ?? null;
  if (body.company !== undefined) updates.company = optionalString(body.company) ?? null;
  if (body.address !== undefined) updates.address = optionalString(body.address) ?? null;
  if (body.position !== undefined) updates.position = optionalString(body.position) ?? null;
  if (body.source !== undefined) updates.source = optionalString(body.source) ?? null;
  if (body.contactChannel !== undefined) updates.contactChannel = optionalString(body.contactChannel) ?? null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo ? Number(body.assignedTo) : null;
  if (body.expectedValue !== undefined) updates.expectedValue = Number(body.expectedValue) || 0;
  if (body.description !== undefined) updates.description = optionalString(body.description) ?? null;
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];
  const lead = await SalesLeads.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  if (!lead) notFound("Lead");
  if (updates.status && updates.status !== existing.status) {
    await logActivity(id, req.user.id, "status_change",
      `Status changed from "${existing.status}" to "${updates.status}"`,
      { from: existing.status, to: updates.status }
    );
  }
  if (updates.assignedTo !== undefined && updates.assignedTo !== existing.assignedTo) {
    const assignedUser = updates.assignedTo
      ? await usersTable.findOne({ id: updates.assignedTo }).select({ name: 1 }).lean()
      : null;
    await logActivity(id, req.user.id, "assigned",
      `Lead assigned to ${assignedUser?.name ?? "nobody"}`
    );
  }
  res.json(lead);
}

async function bulkUpdateLeads(req, res) {
  const { ids, status, assignedTo } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) badRequest("ids array is required.", "ids");
  const update = {};
  if (status) update.status = status;
  if (assignedTo !== undefined) update.assignedTo = assignedTo ? Number(assignedTo) : null;
  if (Object.keys(update).length === 0) badRequest("At least one field to update is required.");
  await SalesLeads.updateMany({ id: { $in: ids } }, { $set: update });
  res.json({ success: true, updated: ids.length });
}

async function convertLead(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const lead = await SalesLeads.findOne({ id }).lean();
  if (!lead) notFound("Lead");
  if (lead.status === "converted") badRequest("This lead has already been converted.", "status");
  const body = req.body;
  const portalEmail = optionalString(body.portalEmail ?? body.email ?? lead.email);
  const portalPassword = optionalString(body.password);
  if (!portalEmail) badRequest("Portal login email is required.", "portalEmail");
  if (!portalPassword || portalPassword.length < 8) {
    badRequest("Portal password must be at least 8 characters.", "password");
  }
  let clientId = null;
  let portalUserId = null;
  let customerId = null;
  try {
    portalUserId = await createClientPortalUser({
      name: lead.name,
      email: portalEmail,
      password: portalPassword,
      setByUserId: req.user.id,
      setByLabel: req.user.name,
    });
    const clientSeqId = await getNextSequence("clients");
    const client = await clientsTable.create({
      id: clientSeqId,
      companyName: optionalString(body.companyName) ?? lead.company ?? lead.name,
      contactPerson: lead.name,
      email: (lead.email ?? portalEmail).toLowerCase(),
      phone: optionalString(body.phone) ?? lead.phone ?? null,
      address: optionalString(body.address) ?? lead.address ?? null,
      gstNumber: optionalString(body.gstin) ?? null,
      industry: optionalString(body.industry) ?? null,
      website: optionalString(body.website) ?? null,
      tier: "Standard",
      status: "active",
      portalLogin: true,
      userId: portalUserId,
      createdBy: req.user.id,
    });
    clientId = client.id;
    const customerSeqId = await getNextSequence("sales_customers");
    const customer = await SalesCustomers.create({
      id: customerSeqId,
      companyName: client.companyName,
      contactPerson: lead.name,
      email: client.email,
      phone: client.phone ?? null,
      status: "active",
      type: optionalString(body.type) ?? "corporate",
      location: optionalString(body.location) ?? lead.address ?? null,
      gstin: optionalString(body.gstin) ?? null,
      website: optionalString(body.website) ?? null,
      leadId: id,
      clientId,
      portalUserId,
    });
    customerId = customer.id;
    await SalesLeads.updateOne({ id }, { $set: { status: "converted", customerId, clientId } });
    await logActivity(id, req.user.id, "converted",
      `Lead converted to customer by ${req.user.name}`,
      { customerId, clientId }
    );
    res.status(201).json({ success: true, customerId, clientId, portalUserId });
  } catch (err) {
    if (portalUserId && !clientId) await usersTable.deleteOne({ id: portalUserId }).catch(() => {});
    if (clientId && !customerId) {
      await clientsTable.deleteOne({ id: clientId }).catch(() => {});
      if (portalUserId) await usersTable.deleteOne({ id: portalUserId }).catch(() => {});
    }
    throw err;
  }
}

async function getLeadActivity(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesLeadActivity,
    { leadId: id },
    { page, limit, skip },
    { sort: { createdAt: -1 } }
  );
  const actorIds = [...new Set(items.map((a) => a.actorId).filter(Boolean))];
  let actorMap = new Map();
  if (actorIds.length) {
    const users = await usersTable.find({ id: { $in: actorIds } }).select({ id: 1, name: 1, avatarUrl: 1 }).lean();
    actorMap = new Map(users.map((u) => [u.id, u]));
  }
  const activities = items.map((a) => ({
    ...a,
    actor: a.actorId ? (actorMap.get(a.actorId) ?? null) : null,
  }));
  res.json({ activities, total, page: pg, limit: lim });
}

async function setReminder(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const lead = await SalesLeads.findOne({ id }).lean();
  if (!lead) notFound("Lead");
  const { date, note } = req.body;
  if (!date) badRequest("date is required.", "date");
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) badRequest("date is invalid.", "date");
  const reminder = { date: parsedDate, note: optionalString(note) ?? "" };
  await SalesLeads.updateOne({ id }, { $set: { reminder } });
  await logActivity(id, req.user.id, "reminder_set",
    `Reminder set for ${parsedDate.toDateString()}`,
    { date, note: reminder.note }
  );
  res.json({ success: true, reminder });
}

export {
  listLeads,
  createLead,
  getLeadById,
  updateLead,
  bulkUpdateLeads,
  convertLead,
  getLeadActivity,
  setReminder,
};
