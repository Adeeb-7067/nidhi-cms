import {
  SalesLeads,
  SalesLeadActivity,
  SalesFollowUps,
  SalesProposals,
  clientsTable,
  usersTable,
  getNextSequence,
  leadStatuses,
  leadNoFollowUpStatuses,
  leadPriorities,
} from "../../../models/schema/index.js";
import { createClientCompanyRecord, deleteClientCompany } from "../../identity/services/client-company-provision.js";
import { resolveCustomerAssignedAdminId } from "../../../utils/sales-bde-customer-scope.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  forbidden,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";

async function logActivity(leadId, actorId, type, description, meta = {}) {
  const id = await getNextSequence("sales_lead_activity");
  await SalesLeadActivity.create({ id, leadId, type, description, actorId, meta });
}

async function hydrateAssignees(leads) {
  const userIds = [...new Set([
    ...leads.map((l) => l.assignedTo).filter(Boolean),
    ...leads.map((l) => l.createdBy).filter(Boolean),
  ])];
  if (!userIds.length) return leads.map((l) => ({ ...l, assignedToUser: null, createdByUser: null }));
  const users = await usersTable
    .find({ id: { $in: userIds } })
    .select({ id: 1, name: 1, avatarUrl: 1 })
    .lean();
  const map = new Map(users.map((u) => [u.id, u]));
  return leads.map((l) => ({
    ...l,
    assignedToUser: l.assignedTo ? (map.get(l.assignedTo) ?? null) : null,
    createdByUser: l.createdBy ? (map.get(l.createdBy) ?? null) : null,
  }));
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
  // BDE scope: only see leads assigned to or created by them
  if (req.user.role === "bde") {
    delete filter.assignedTo;
    const bdeCon = { $or: [{ assignedTo: req.user.id }, { createdBy: req.user.id }] };
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, bdeCon];
      delete filter.$or;
    } else {
      filter.$or = bdeCon.$or;
    }
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
    assignedTo: req.user.role === "bde"
      ? req.user.id
      : (body.assignedTo ? Number(body.assignedTo) : null),
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
  if (req.user.role === "bde" && lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id) {
    notFound("Lead");
  }
  const [activities, followUps, assignedUser, createdByUser] = await Promise.all([
    SalesLeadActivity.find({ leadId: id }).sort({ createdAt: -1 }).limit(50).lean(),
    SalesFollowUps.find({ leadId: id }).sort({ scheduledAt: 1 }).lean(),
    lead.assignedTo
      ? usersTable.findOne({ id: lead.assignedTo }).select({ id: 1, name: 1, avatarUrl: 1 }).lean()
      : null,
    lead.createdBy
      ? usersTable.findOne({ id: lead.createdBy }).select({ id: 1, name: 1, avatarUrl: 1 }).lean()
      : null,
  ]);
  res.json({ ...lead, activities, followUps, assignedToUser: assignedUser, createdByUser });
}

async function updateLead(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const existing = await SalesLeads.findOne({ id }).lean();
  if (!existing) notFound("Lead");
  if (req.user.role === "bde" && existing.assignedTo !== req.user.id && existing.createdBy !== req.user.id) {
    notFound("Lead");
  }
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
  if (body.status !== undefined) {
    if (!leadStatuses.includes(body.status)) {
      badRequest(`Invalid status "${body.status}".`, "status");
    }
    updates.status = body.status;
  }
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.assignedTo !== undefined) {
    if (req.user.role === "bde") {
      const nextAssignee = body.assignedTo ? Number(body.assignedTo) : null;
      if (nextAssignee != null && nextAssignee !== req.user.id) {
        forbidden("BDE cannot assign leads to other executives.");
      }
      if (nextAssignee != null) updates.assignedTo = nextAssignee;
    } else {
      updates.assignedTo = body.assignedTo ? Number(body.assignedTo) : null;
    }
  }
  if (body.expectedValue !== undefined) updates.expectedValue = Number(body.expectedValue) || 0;
  if (body.description !== undefined) updates.description = optionalString(body.description) ?? null;
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];

  // ── Planning doc: add one ──────────────────────────────────────────────────
  if (body.addPlanningDoc) {
    const { name, url } = body.addPlanningDoc;
    if (!name || !url) badRequest("addPlanningDoc requires name and url.", "addPlanningDoc");
    const isFirst = !(existing.planningDocs?.length > 0);
    const mongoOp = {
      $push: { planningDocs: { name: String(name).trim(), url: String(url), uploadedAt: new Date() } },
    };
    // Auto-advance on first doc when at project_planning stage
    if (isFirst && existing.status === "project_planning") {
      mongoOp.$set = { status: "proposal_sent" };
    }
    const lead = await SalesLeads.findOneAndUpdate({ id }, mongoOp, { new: true }).lean();
    if (!lead) notFound("Lead");
    await logActivity(id, req.user.id, "document_uploaded",
      `Planning document uploaded: "${name}"`,
      { docUrl: url, docName: name }
    );
    if (mongoOp.$set?.status) {
      await logActivity(id, req.user.id, "status_change",
        `Status changed from "project_planning" to "proposal_sent"`,
        { from: "project_planning", to: "proposal_sent" }
      );
    }
    return res.json(lead);
  }

  // ── Planning doc: remove one ───────────────────────────────────────────────
  if (body.removePlanningDoc) {
    const url = String(body.removePlanningDoc);
    const docToRemove = existing.planningDocs?.find((d) => d.url === url);
    const lead = await SalesLeads.findOneAndUpdate(
      { id },
      { $pull: { planningDocs: { url } } },
      { new: true }
    ).lean();
    if (!lead) notFound("Lead");
    if (docToRemove) {
      await logActivity(id, req.user.id, "document_removed",
        `Planning document removed: "${docToRemove.name}"`,
        { docUrl: url }
      );
    }
    return res.json(lead);
  }

  // Pausing outreach: clear reminder and cancel open follow-ups
  if (
    updates.status &&
    updates.status !== existing.status &&
    leadNoFollowUpStatuses.includes(updates.status)
  ) {
    updates.reminder = null;
  }

  const lead = await SalesLeads.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  if (!lead) notFound("Lead");
  if (updates.status && updates.status !== existing.status) {
    await logActivity(id, req.user.id, "status_change",
      `Status changed from "${existing.status}" to "${updates.status}"`,
      { from: existing.status, to: updates.status }
    );
    if (leadNoFollowUpStatuses.includes(updates.status)) {
      await SalesFollowUps.updateMany(
        { leadId: id, status: { $in: ["scheduled", "overdue"] } },
        { $set: { status: "cancelled" } }
      );
    }
  }
  if (updates.assignedTo !== undefined && updates.assignedTo !== existing.assignedTo) {
    const assignedUser = updates.assignedTo
      ? await usersTable.findOne({ id: updates.assignedTo }).select({ name: 1 }).lean()
      : null;
    await logActivity(id, req.user.id, "assigned",
      `Lead assigned to ${assignedUser?.name ?? "nobody"}`
    );
    // Reassigning a lead that's already been converted must carry over to the
    // linked customer record — otherwise the new executive can never see it,
    // since customer ownership (assignedAdminId) is tracked separately from
    // lead ownership (assignedTo).
    if (existing.customerId) {
      await clientsTable.updateOne(
        { id: existing.customerId },
        { $set: { assignedAdminId: updates.assignedTo } }
      );
    }
  }
  res.json(lead);
}

async function bulkUpdateLeads(req, res) {
  const { ids, status, assignedTo } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) badRequest("ids array is required.", "ids");
  const update = {};
  if (status) {
    if (!leadStatuses.includes(status)) badRequest(`Invalid status "${status}".`, "status");
    update.status = status;
    if (leadNoFollowUpStatuses.includes(status)) update.reminder = null;
  }
  if (assignedTo !== undefined) {
    if (req.user.role === "bde") {
      const nextAssignee = assignedTo ? Number(assignedTo) : null;
      if (nextAssignee != null && nextAssignee !== req.user.id) {
        forbidden("BDE cannot assign leads to other executives.");
      }
      if (nextAssignee != null) update.assignedTo = nextAssignee;
    } else {
      update.assignedTo = assignedTo ? Number(assignedTo) : null;
    }
  }
  if (Object.keys(update).length === 0) badRequest("At least one field to update is required.");
  // BDE: restrict bulk operations to their own leads only
  const filter = req.user.role === "bde"
    ? { id: { $in: ids }, $or: [{ assignedTo: req.user.id }, { createdBy: req.user.id }] }
    : { id: { $in: ids } };
  const result = await SalesLeads.updateMany(filter, { $set: update });
  if (status && leadNoFollowUpStatuses.includes(status)) {
    const affected = await SalesLeads.find(filter).select({ id: 1 }).lean();
    const affectedIds = affected.map((l) => l.id);
    if (affectedIds.length) {
      await SalesFollowUps.updateMany(
        { leadId: { $in: affectedIds }, status: { $in: ["scheduled", "overdue"] } },
        { $set: { status: "cancelled" } }
      );
    }
  }
  // Carry reassignment over to any already-converted customer records so the
  // new executive isn't left unable to see the resulting customer.
  if (update.assignedTo !== undefined) {
    const convertedLeads = await SalesLeads.find(
      { ...filter, customerId: { $ne: null } },
      { customerId: 1 }
    ).lean();
    const customerIds = convertedLeads.map((l) => l.customerId).filter(Boolean);
    if (customerIds.length) {
      await clientsTable.updateMany(
        { id: { $in: customerIds } },
        { $set: { assignedAdminId: update.assignedTo } }
      );
    }
  }
  res.json({ success: true, updated: result.modifiedCount });
}

async function convertLead(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const lead = await SalesLeads.findOne({ id }).lean();
  if (!lead) notFound("Lead");
  if (req.user.role === "bde" && lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id) {
    notFound("Lead");
  }
  if (lead.status === "converted") badRequest("This lead has already been converted.", "status");
  if (lead.status === "closed_elsewhere") {
    badRequest(
      "This lead closed a deal elsewhere — change the status to reopen outreach before converting.",
      "status"
    );
  }
  // Guard against partial-failure retries: if a customer already exists for this lead
  // (created by a prior attempt that failed at the final updateOne), block re-conversion.
  const existingCustomer = await clientsTable.findOne({ leadId: id }).lean();
  if (existingCustomer) badRequest("A customer record already exists for this lead. Contact support to resolve.", "leadId");
  const body = req.body;
  const portalEmail = optionalString(body.portalEmail ?? body.email ?? lead.email);
  const portalPassword = optionalString(body.password);
  if (!portalEmail) badRequest("Portal login email is required.", "portalEmail");
  if (!portalPassword || portalPassword.length < 8) {
    badRequest("Portal password must be at least 8 characters.", "password");
  }
  let clientId = null;
  try {
    const { client, portalUserId } = await createClientCompanyRecord({
      companyName: optionalString(body.companyName) ?? lead.company ?? lead.name,
      contactPerson: lead.name,
      email: lead.email ?? portalEmail,
      enablePortal: true,
      portalEmail,
      portalPassword,
      phone: optionalString(body.phone) ?? lead.phone,
      address: optionalString(body.address) ?? lead.address,
      gstNumber: optionalString(body.gstin),
      website: optionalString(body.website),
      industry: optionalString(body.industry),
      customerType: optionalString(body.type) ?? "corporate",
      leadId: id,
      assignedAdminId: resolveCustomerAssignedAdminId({
        userRole: req.user.role,
        userId: req.user.id,
        leadAssignedTo: lead.assignedTo,
      }),
      createdByUserId: req.user.id,
      createdByLabel: req.user.name,
    });
    clientId = client.id;
    await SalesProposals.updateMany({ leadId: id }, { $set: { customerId: client.id } });
    await SalesLeads.updateOne({ id }, { $set: { status: "converted", customerId: client.id, clientId: client.id } });
    await logActivity(id, req.user.id, "converted",
      `Lead converted to customer by ${req.user.name}`,
      { customerId: client.id, clientId: client.id }
    );
    res.status(201).json({ success: true, customerId: client.id, clientId: client.id, portalUserId });
  } catch (err) {
    if (clientId) {
      const row = await clientsTable.findOne({ id: clientId }).lean();
      if (row) await deleteClientCompany(row).catch(() => {});
    }
    throw err;
  }
}

async function getLeadActivity(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const lead = await SalesLeads.findOne({ id }).lean();
  if (!lead) notFound("Lead");
  if (req.user.role === "bde" && lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id) {
    notFound("Lead");
  }
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
  if (req.user.role === "bde" && lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id) {
    notFound("Lead");
  }
  if (leadNoFollowUpStatuses.includes(lead.status)) {
    badRequest(
      lead.status === "closed_elsewhere"
        ? "This lead closed a deal elsewhere — pause reminders until you reopen outreach."
        : "Reminders are not allowed for this lead status.",
      "status"
    );
  }

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

async function deleteLead(req, res) {
  const id = parseIdParam(req.params.id, "lead id");
  const lead = await SalesLeads.findOne({ id }).lean();
  if (!lead) notFound("Lead");
  if (req.user.role === "bde" && lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id) {
    notFound("Lead");
  }
  if (lead.status === "converted" && lead.customerId) {
    badRequest("Cannot delete a converted lead. Manage the customer record instead.", "status");
  }

  await Promise.all([
    SalesLeadActivity.deleteMany({ leadId: id }),
    SalesFollowUps.deleteMany({ leadId: id }),
    SalesLeads.deleteOne({ id }),
  ]);

  res.json({ success: true, id });
}

async function importLeads(req, res) {
  const rows = req.body?.leads;
  if (!Array.isArray(rows) || rows.length === 0) badRequest("leads array is required.", "leads");
  if (rows.length > 500) badRequest("Maximum 500 leads per import.", "leads");

  const created = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? {};
    const name = optionalString(row.name);
    if (!name) {
      errors.push({ row: i + 1, message: "Name is required." });
      continue;
    }
    const status = optionalString(row.status) ?? "new";
    const priority = optionalString(row.priority) ?? "medium";
    if (!leadStatuses.includes(status)) {
      errors.push({ row: i + 1, message: `Invalid status "${status}".` });
      continue;
    }
    if (!leadPriorities.includes(priority)) {
      errors.push({ row: i + 1, message: `Invalid priority "${priority}".` });
      continue;
    }
    try {
      const id = await getNextSequence("sales_leads");
      const lead = await SalesLeads.create({
        id,
        name,
        email: optionalString(row.email)?.toLowerCase() ?? null,
        phone: optionalString(row.phone) ?? null,
        company: optionalString(row.company) ?? null,
        address: optionalString(row.address) ?? null,
        position: optionalString(row.position) ?? null,
        source: optionalString(row.source) ?? null,
        contactChannel: optionalString(row.contactChannel ?? row.channel) ?? null,
        status,
        priority,
        assignedTo: req.user.role === "bde"
          ? req.user.id
          : (row.assignedTo ? Number(row.assignedTo) : null),
        expectedValue: Number(row.expectedValue) || 0,
        description: optionalString(row.description) ?? null,
        tags: Array.isArray(row.tags) ? row.tags.filter((t) => typeof t === "string") : [],
        createdBy: req.user.id,
      });
      await logActivity(id, req.user.id, "created", `Lead imported by ${req.user.name}`);
      created.push(lead.toObject());
    } catch (err) {
      errors.push({ row: i + 1, message: err.message ?? "Failed to create lead." });
    }
  }

  res.status(201).json({ created: created.length, errors, leads: created });
}

async function getDueReminders(req, res) {
  const now = new Date();
  const filter = {
    reminder: { $ne: null },
    "reminder.date": { $lte: now },
    status: { $nin: leadNoFollowUpStatuses },
  };
  if (req.user.role === "bde") {
    filter.$or = [{ assignedTo: req.user.id }, { createdBy: req.user.id }];
  }
  const leads = await SalesLeads.find(filter, { id: 1, name: 1, reminder: 1 }).lean();
  res.json({ leads });
}

export {
  listLeads,
  createLead,
  importLeads,
  getLeadById,
  updateLead,
  bulkUpdateLeads,
  convertLead,
  getLeadActivity,
  setReminder,
  getDueReminders,
  deleteLead,
};
