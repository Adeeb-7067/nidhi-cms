import {
  SalesCustomers,
  SalesInstallments,
  SalesInvoices,
  SalesPayments,
  SalesProposals,
  clientsTable,
  usersTable,
  projectsTable,
  ticketsTable,
  tasksTable,
  clientTeamMembersTable,
  credentialHistoryTable,
  inventoryCredentialsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { paginateModel, toIso } from "../../utils/mongo-list.js";
import { formatProject } from "../../mappers/project-format.js";
import { formatUser } from "../../mappers/user-format.js";
import {
  badRequest,
  forbidden,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";
import { createClientPortalUser, updateClientPortalEmail } from "../../services/client-portal.js";
import { sendCustomerPaymentReminderEmail } from "../../lib/email.js";

async function loadStaffUser(userId) {
  if (!userId) return null;
  const user = await usersTable
    .findOne({ id: userId })
    .select({ id: 1, name: 1, email: 1, avatarUrl: 1, role: 1, designation: 1, phoneNumber: 1, status: 1 })
    .lean();
  return user ? formatUser(user) : null;
}

async function formatTeamMember(member) {
  const user = await usersTable
    .findOne({ id: member.userId })
    .select({ id: 1, name: 1, email: 1, phoneNumber: 1, avatarUrl: 1, status: 1 })
    .lean();
  return {
    id: member.id,
    userId: member.userId,
    name: user?.name ?? null,
    email: user?.email ?? null,
    phoneNumber: user?.phoneNumber ?? null,
    title: member.title ?? null,
    role: member.title ?? "Member",
    status: member.status,
    avatarUrl: user?.avatarUrl ?? null,
    activatedAt: toIso(member.activatedAt),
    lastLoginAt: toIso(user?.lastLoginAt),
  };
}

async function getCustomerHub(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const customer = await SalesCustomers.findOne({ id }).lean();
  if (!customer) notFound("Customer");

  const [assignedAdmin, client, paymentsForCustomer] = await Promise.all([
    loadStaffUser(customer.assignedAdminId),
    customer.clientId ? clientsTable.findOne({ id: customer.clientId }).lean() : null,
    SalesPayments.find({ customerId: id }).sort({ createdAt: -1 }).limit(200).lean(),
  ]);

  let clientAdmin = null;
  let projects = [];
  let tickets = [];
  let tasks = [];
  let teamMembers = [];
  let portalCredentials = [];
  let inventoryCredentials = [];

  if (client?.userId) {
    clientAdmin = await loadStaffUser(client.userId);
  }

  const credentialUserId = customer.portalUserId ?? client?.userId ?? null;
  if (credentialUserId) {
    const credRows = await credentialHistoryTable
      .find({ userId: credentialUserId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    portalCredentials = credRows.map((c) => ({
      id: c.id,
      label: c.setByLabel ?? "Portal login",
      setByLabel: c.setByLabel ?? null,
      createdAt: toIso(c.createdAt),
    }));
  }

  if (customer.clientId) {
    const companyId = customer.clientId;
    const [projectRows, memberRows] = await Promise.all([
      projectsTable
        .find({ $or: [{ companyId }, { clientId: companyId }] })
        .sort({ createdAt: -1 })
        .lean(),
      clientTeamMembersTable.find({ clientCompanyId: companyId }).sort({ createdAt: -1 }).lean(),
    ]);

    projects = await Promise.all(projectRows.map((p) => formatProject(p)));
    teamMembers = await Promise.all(memberRows.map(formatTeamMember));

    const projectIds = projectRows.map((p) => p.id);
    const projectNameMap = new Map(projectRows.map((p) => [p.id, p.name]));

    const ticketFilter = projectIds.length
      ? { $or: [{ companyId }, { projectId: { $in: projectIds } }] }
      : { companyId };
    const ticketRows = await ticketsTable
      .find(ticketFilter)
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    if (projectIds.length) {
      const taskRows = await tasksTable
        .find({ projectId: { $in: projectIds } })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean();
      const assigneeIds = [...new Set(taskRows.map((t) => t.assigneeId).filter(Boolean))];
      const assignees = assigneeIds.length
        ? await usersTable.find({ id: { $in: assigneeIds } }).select({ id: 1, name: 1 }).lean()
        : [];
      const assigneeMap = new Map(assignees.map((u) => [u.id, u.name]));

      tasks = taskRows.map((t) => ({
        id: t.id,
        taskNumber: t.taskNumber,
        title: t.title,
        projectId: t.projectId,
        projectName: projectNameMap.get(t.projectId) ?? null,
        assigneeId: t.assigneeId,
        assigneeName: t.assigneeId ? assigneeMap.get(t.assigneeId) ?? null : null,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? toIso(t.dueDate) : null,
        progress: t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 0,
        updatedAt: toIso(t.updatedAt),
        createdAt: toIso(t.createdAt),
      }));

      const credInvRows = await inventoryCredentialsTable
        .find({ projectId: { $in: projectIds }, deletedAt: null })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean();
      inventoryCredentials = credInvRows.map((c) => ({
        id: c.id,
        projectId: c.projectId,
        projectName: projectNameMap.get(c.projectId) ?? null,
        name: c.label,
        username: c.username ?? null,
        url: c.url ?? null,
        category: c.type ?? null,
        updatedAt: toIso(c.updatedAt),
      }));
    }

    const ticketAssigneeIds = [...new Set(ticketRows.map((t) => t.assignedTo).filter(Boolean))];
    const ticketAssignees = ticketAssigneeIds.length
      ? await usersTable.find({ id: { $in: ticketAssigneeIds } }).select({ id: 1, name: 1 }).lean()
      : [];
    const ticketAssigneeMap = new Map(ticketAssignees.map((u) => [u.id, u.name]));

    tickets = ticketRows.map((t) => ({
      id: t.id,
      subject: t.title,
      priority: t.priority,
      status: t.status,
      assignedTo: t.assignedTo,
      assignedToName: t.assignedTo ? ticketAssigneeMap.get(t.assignedTo) ?? null : null,
      projectId: t.projectId,
      createdAt: toIso(t.createdAt),
      updatedAt: toIso(t.updatedAt),
    }));
  }

  res.json({
    assignedAdmin,
    clientAdmin,
    client: client
      ? {
          id: client.id,
          companyName: client.companyName,
          status: client.status,
          tier: client.tier,
          userId: client.userId,
        }
      : null,
    projects,
    teamMembers,
    tickets,
    tasks,
    portalCredentials,
    inventoryCredentials,
    recentPayments: paymentsForCustomer.map((p) => ({
      id: p.id,
      amount: p.amount,
      receiptNumber: p.receiptNumber,
      invoiceId: p.invoiceId,
      paymentMethod: p.paymentMethod,
      createdAt: toIso(p.createdAt),
    })),
  });
}

async function syncLinkedClientRecord(customer, updates) {
  if (!customer.clientId) return;
  const clientUpdates = {};
  if (updates.companyName !== undefined) clientUpdates.companyName = updates.companyName;
  if (updates.contactPerson !== undefined) clientUpdates.contactPerson = updates.contactPerson;
  if (updates.email !== undefined) clientUpdates.email = updates.email;
  if (updates.phone !== undefined) clientUpdates.phone = updates.phone;
  if (updates.location !== undefined) clientUpdates.address = updates.location;
  if (updates.gstin !== undefined) clientUpdates.gstNumber = updates.gstin;
  if (updates.website !== undefined) clientUpdates.website = updates.website;
  if (Object.keys(clientUpdates).length) {
    await clientsTable.updateOne({ id: customer.clientId }, { $set: clientUpdates });
  }
  if (updates.email !== undefined && customer.portalUserId) {
    await updateClientPortalEmail({ userId: customer.portalUserId, email: updates.email });
  }
}

function computeCustomerFinancials(invoices) {
  const financials = new Map();
  for (const inv of invoices) {
    if (!financials.has(inv.customerId)) financials.set(inv.customerId, { totalSales: 0, outstanding: 0 });
    const entry = financials.get(inv.customerId);
    entry.totalSales += inv.amount;
    entry.outstanding += Math.max(0, inv.amount - inv.paidAmount);
  }
  return financials;
}

async function listCustomers(req, res) {
  const { status, type, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (search?.trim()) {
    const re = { $regex: search.trim(), $options: "i" };
    filter.$or = [{ companyName: re }, { contactPerson: re }, { email: re }];
  }
  // BDE scope: only see customers assigned to them
  if (req.user.role === "bde") {
    filter.assignedAdminId = req.user.id;
  }
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesCustomers,
    filter,
    { page, limit, skip },
    { sort: { createdAt: -1 } }
  );
  const customerIds = items.map((c) => c.id);
  const invoices = customerIds.length
    ? await SalesInvoices.find({ customerId: { $in: customerIds } })
        .select({ customerId: 1, amount: 1, paidAmount: 1 })
        .lean()
    : [];
  const financials = computeCustomerFinancials(invoices);
  const customers = items.map((c) => ({
    ...c,
    totalSales: financials.get(c.id)?.totalSales ?? 0,
    outstanding: financials.get(c.id)?.outstanding ?? 0,
  }));
  res.json({ customers, total, page: pg, limit: lim });
}

async function createCustomer(req, res) {
  const body = req.body;
  const companyName = optionalString(body.companyName);
  const contactPerson = optionalString(body.contactPerson);
  const email = optionalString(body.email);
  if (!companyName) badRequest("Company name is required.", "companyName");
  if (!contactPerson) badRequest("Contact person is required.", "contactPerson");
  if (!email) badRequest("Email is required.", "email");
  const id = await getNextSequence("sales_customers");
  const customer = await SalesCustomers.create({
    id,
    companyName,
    contactPerson,
    email: email.toLowerCase(),
    phone: optionalString(body.phone) ?? null,
    status: optionalString(body.status) ?? "active",
    type: optionalString(body.type) ?? "corporate",
    location: optionalString(body.location) ?? null,
    gstin: optionalString(body.gstin) ?? null,
    website: optionalString(body.website) ?? null,
    leadId: body.leadId ? Number(body.leadId) : null,
    clientId: body.clientId ? Number(body.clientId) : null,
    portalUserId: body.portalUserId ? Number(body.portalUserId) : null,
  });
  res.status(201).json(customer.toObject());
}

async function getCustomerById(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const customer = await SalesCustomers.findOne({ id }).lean();
  if (!customer) notFound("Customer");
  if (req.user.role === "bde" && customer.assignedAdminId !== req.user.id) {
    notFound("Customer");
  }
  const [installments, invoices, assignedAdmin] = await Promise.all([
    SalesInstallments.find({ customerId: id }).sort({ dueDate: 1 }).lean(),
    SalesInvoices.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
    loadStaffUser(customer.assignedAdminId),
  ]);
  const totalSales = invoices.reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.reduce((s, i) => s + Math.max(0, i.amount - i.paidAmount), 0);
  res.json({ ...customer, installments, invoices, totalSales, outstanding, assignedAdmin });
}

async function updateCustomer(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const customer = await SalesCustomers.findOne({ id }).lean();
  if (!customer) notFound("Customer");
  const body = req.body;
  const updates = {};
  if (body.companyName !== undefined) updates.companyName = optionalString(body.companyName);
  if (body.contactPerson !== undefined) updates.contactPerson = optionalString(body.contactPerson);
  if (body.email !== undefined) updates.email = optionalString(body.email)?.toLowerCase() ?? null;
  if (body.phone !== undefined) updates.phone = optionalString(body.phone) ?? null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.type !== undefined) updates.type = body.type;
  if (body.location !== undefined) updates.location = optionalString(body.location) ?? null;
  if (body.gstin !== undefined) updates.gstin = optionalString(body.gstin) ?? null;
  if (body.website !== undefined) updates.website = optionalString(body.website) ?? null;
  if (body.assignedAdminId !== undefined) {
    if (req.user.role !== "super_admin") {
      forbidden("Only super admin can assign a custom admin.");
    }
    const adminId = body.assignedAdminId === null || body.assignedAdminId === ""
      ? null
      : Number(body.assignedAdminId);
    if (adminId != null && !Number.isFinite(adminId)) {
      badRequest("Invalid assigned admin id.", "assignedAdminId");
    }
    if (adminId != null) {
      const adminUser = await usersTable.findOne({ id: adminId }).select({ id: 1, status: 1 }).lean();
      if (!adminUser) notFound("Assigned admin user");
    }
    updates.assignedAdminId = adminId;
  }

  if (Object.keys(updates).length) {
    await syncLinkedClientRecord(customer, updates);
  }

  const updated = await SalesCustomers.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  const assignedAdmin = await loadStaffUser(updated.assignedAdminId);
  res.json({ ...updated, assignedAdmin });
}

async function deleteCustomer(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const customer = await SalesCustomers.findOne({ id }).lean();
  if (!customer) notFound("Customer");

  const [proposals, invoices, installments, payments] = await Promise.all([
    SalesProposals.countDocuments({ customerId: id }),
    SalesInvoices.countDocuments({ customerId: id }),
    SalesInstallments.countDocuments({ customerId: id }),
    SalesPayments.countDocuments({ customerId: id }),
  ]);
  if (proposals + invoices + installments + payments > 0) {
    badRequest(
      "Cannot delete a customer with billing history. Set status to inactive instead.",
      "customerId"
    );
  }

  await SalesCustomers.deleteOne({ id });
  res.json({ success: true });
}

async function provisionCustomerPortal(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const customer = await SalesCustomers.findOne({ id }).lean();
  if (!customer) notFound("Customer");
  if (customer.clientId || customer.portalUserId) {
    badRequest("This customer already has portal access.", "portal");
  }

  const body = req.body;
  const portalEmail = optionalString(body.portalEmail ?? customer.email);
  const portalPassword = optionalString(body.password);
  if (!portalEmail) badRequest("Portal login email is required.", "portalEmail");
  if (!portalPassword || portalPassword.length < 8) {
    badRequest("Portal password must be at least 8 characters.", "password");
  }

  let clientId = null;
  let portalUserId = null;
  try {
    portalUserId = await createClientPortalUser({
      name: customer.contactPerson,
      email: portalEmail,
      password: portalPassword,
      setByUserId: req.user.id,
      setByLabel: req.user.name,
    });
    const clientSeqId = await getNextSequence("clients");
    const client = await clientsTable.create({
      id: clientSeqId,
      companyName: optionalString(body.companyName) ?? customer.companyName,
      contactPerson: customer.contactPerson,
      email: portalEmail.toLowerCase(),
      phone: customer.phone ?? null,
      address: customer.location ?? null,
      gstNumber: customer.gstin ?? null,
      industry: optionalString(body.industry) ?? null,
      website: customer.website ?? null,
      tier: "Standard",
      status: "active",
      portalLogin: true,
      userId: portalUserId,
      createdBy: req.user.id,
    });
    clientId = client.id;
    const updated = await SalesCustomers.findOneAndUpdate(
      { id },
      { $set: { clientId, portalUserId, email: portalEmail.toLowerCase() } },
      { new: true }
    ).lean();
    res.status(201).json({
      success: true,
      customerId: id,
      clientId,
      portalUserId,
      customer: updated,
    });
  } catch (err) {
    if (clientId) await clientsTable.deleteOne({ id: clientId }).catch(() => {});
    if (portalUserId) await usersTable.deleteOne({ id: portalUserId }).catch(() => {});
    throw err;
  }
}

async function getCustomerStatement(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const customer = await SalesCustomers.findOne({ id }).lean();
  if (!customer) notFound("Customer");
  const [invoices, payments] = await Promise.all([
    SalesInvoices.find({ customerId: id }).sort({ createdAt: 1 }).lean(),
    SalesPayments.find({ customerId: id }).sort({ createdAt: 1 }).lean(),
  ]);
  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, totalBilled - totalPaid);
  res.json({
    customer,
    invoices,
    payments,
    summary: { totalBilled, totalPaid, outstanding },
  });
}

async function remindCustomer(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const customer = await SalesCustomers.findOne({ id }).lean();
  if (!customer) notFound("Customer");
  const message =
    optionalString(req.body.message) ?? "You have a pending payment. Please review your account.";

  const invoices = await SalesInvoices.find({ customerId: id })
    .select({ amount: 1, paidAmount: 1 })
    .lean();
  const outstanding = invoices.reduce((s, i) => s + Math.max(0, i.amount - i.paidAmount), 0);
  if (outstanding <= 0) {
    badRequest("This customer has no outstanding balance.", "outstanding");
  }

  const emailResult = await sendCustomerPaymentReminderEmail({
    to: customer.email,
    recipientName: customer.contactPerson,
    companyName: customer.companyName,
    outstandingAmount: outstanding,
    message,
  });

  res.json({
    success: true,
    sentTo: customer.email,
    message,
    outstanding,
    emailSent: emailResult.sent === true,
    emailReason: emailResult.reason ?? null,
  });
}

export {
  listCustomers,
  createCustomer,
  getCustomerById,
  getCustomerHub,
  updateCustomer,
  deleteCustomer,
  provisionCustomerPortal,
  getCustomerStatement,
  remindCustomer,
};
