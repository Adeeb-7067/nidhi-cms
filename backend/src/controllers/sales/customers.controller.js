import {
  clientsTable,
  SalesInstallments,
  SalesInvoices,
  SalesPayments,
  usersTable,
  projectsTable,
  ticketsTable,
  tasksTable,
  clientTeamMembersTable,
  credentialHistoryTable,
  inventoryCredentialsTable,
} from "../../models/schema/index.js";
import { paginateModel, toIso } from "../../utils/mongo-list.js";
import { formatProject } from "../../mappers/project-format.js";
import { formatUser } from "../../mappers/user-format.js";
import {
  formatClientAsCustomer,
  customerUpdatesToClientSet,
  resolveCustomerCreatorUserId,
} from "../../mappers/client-customer-format.js";
import {
  badRequest,
  forbidden,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";
import {
  createClientCompanyRecord,
  enablePortalForClientCompany,
  deleteClientCompany,
  syncPortalEmailIfLinked,
  bootstrapClientDirectDiscussion,
  resolveDiscussionStaffUserId,
} from "../../services/client-company-provision.js";
import { sendCustomerPaymentReminderEmail } from "../../lib/email.js";
import {
  isBillableInvoice,
  sumInvoiceBilled,
  sumInvoiceOutstanding,
} from "../../utils/sales-invoice-filters.js";
import {
  bdeCustomerOwnershipFilter,
  bdeOwnsCustomer,
  resolveCustomerAssignedAdminId,
} from "../../utils/sales-bde-customer-scope.js";

async function loadStaffUser(userId) {
  if (!userId) return null;
  const user = await usersTable
    .findOne({ id: userId })
    .select({ id: 1, name: 1, email: 1, avatarUrl: 1, role: 1, designation: 1, phoneNumber: 1, status: 1 })
    .lean();
  return user ? formatUser(user) : null;
}

async function loadUserAvatarSummaries(userIds) {
  const ids = [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return new Map();
  const users = await usersTable
    .find({ id: { $in: ids } })
    .select({ id: 1, name: 1, avatarUrl: 1 })
    .lean();
  return new Map(
    users.map((u) => [Number(u.id), { id: u.id, name: u.name, avatarUrl: u.avatarUrl ?? null }]),
  );
}

async function attachCreatedByUsers(customers, clientRows) {
  const creatorIds = clientRows.map((c) => resolveCustomerCreatorUserId(c));
  const userMap = await loadUserAvatarSummaries(creatorIds);
  return customers.map((customer, index) => {
    const creatorId = creatorIds[index];
    return {
      ...customer,
      createdByUser: creatorId ? (userMap.get(creatorId) ?? null) : null,
    };
  });
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

async function findClientOr404(id, user) {
  const client = await clientsTable.findOne({ id }).lean();
  if (!client) notFound("Customer");
  if (user?.role === "bde" && !bdeOwnsCustomer(client, user.id)) {
    notFound("Customer");
  }
  return client;
}

function computeCustomerFinancials(invoices) {
  const financials = new Map();
  for (const inv of invoices) {
    if (!isBillableInvoice(inv)) continue;
    if (!financials.has(inv.customerId)) financials.set(inv.customerId, { totalSales: 0, outstanding: 0 });
    const entry = financials.get(inv.customerId);
    entry.totalSales += inv.amount;
    entry.outstanding += Math.max(0, inv.amount - inv.paidAmount);
  }
  return financials;
}

async function customerIdsWithPayments(customerIds) {
  if (!customerIds.length) return new Set();
  const ids = await SalesPayments.distinct("customerId", { customerId: { $in: customerIds } });
  return new Set(ids.map(Number));
}

async function getCustomerHub(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const client = await findClientOr404(id, req.user);

  const [assignedAdmin, paymentsForCustomer] = await Promise.all([
    loadStaffUser(client.assignedAdminId),
    SalesPayments.find({ customerId: id }).sort({ createdAt: -1 }).limit(200).lean(),
  ]);

  let clientAdmin = null;
  let projects = [];
  let tickets = [];
  let tasks = [];
  let teamMembers = [];
  let portalCredentials = [];
  let inventoryCredentials = [];

  if (client.userId) {
    clientAdmin = await loadStaffUser(client.userId);
  }

  if (client.userId) {
    const credRows = await credentialHistoryTable
      .find({ userId: client.userId })
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

  const companyId = client.id;
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

  res.json({
    assignedAdmin,
    clientAdmin,
    client: {
      id: client.id,
      companyName: client.companyName,
      status: client.status,
      tier: client.tier,
      userId: client.userId,
    },
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

async function listCustomers(req, res) {
  const { status, type, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const clauses = [];
  if (status) clauses.push({ status });
  if (type) clauses.push({ customerType: type });
  if (search?.trim()) {
    const re = { $regex: search.trim(), $options: "i" };
    clauses.push({ $or: [{ companyName: re }, { contactPerson: re }, { email: re }] });
  }
  if (req.user.role === "bde") {
    clauses.push(bdeCustomerOwnershipFilter(req.user.id));
  }
  const filter =
    clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };
  const { items, total, page: pg, limit: lim } = await paginateModel(
    clientsTable,
    filter,
    { page, limit, skip },
    { sort: { createdAt: -1 } }
  );
  const customerIds = items.map((c) => c.id);
  const invoices = customerIds.length
    ? await SalesInvoices.find({ customerId: { $in: customerIds } })
        .select({ customerId: 1, amount: 1, paidAmount: 1, status: 1 })
        .lean()
    : [];
  const financials = computeCustomerFinancials(invoices);
  const paymentCustomerIds = await customerIdsWithPayments(customerIds);
  const customers = await attachCreatedByUsers(
    items.map((c) =>
      formatClientAsCustomer(c, {
        ...(financials.get(c.id) ?? {}),
        hasPayments: paymentCustomerIds.has(c.id),
      }),
    ),
    items,
  );
  res.json({ customers, total, page: pg, limit: lim });
}

async function getCustomersSummary(req, res) {
  const customerFilter =
    req.user.role === "bde" ? bdeCustomerOwnershipFilter(req.user.id) : {};
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalCustomers, activeCustomers, inactiveCustomers, companyIds] = await Promise.all([
    clientsTable.countDocuments(customerFilter),
    clientsTable.countDocuments({ ...customerFilter, status: "active" }),
    clientsTable.countDocuments({ ...customerFilter, status: "inactive" }),
    clientsTable.find(customerFilter).select({ id: 1 }).lean().then((rows) => rows.map((c) => c.id)),
  ]);

  const companyScope = companyIds.length
    ? { clientCompanyId: { $in: companyIds } }
    : { clientCompanyId: -1 };

  const [activeContacts, inactiveContacts, memberUserIds] = await Promise.all([
    clientTeamMembersTable.countDocuments({ ...companyScope, status: "active" }),
    clientTeamMembersTable.countDocuments({ ...companyScope, status: "inactive" }),
    clientTeamMembersTable.distinct("userId", companyScope),
  ]);

  const contactsLoggedInToday = memberUserIds.length
    ? await usersTable.countDocuments({
        id: { $in: memberUserIds },
        lastLoginAt: { $gte: todayStart },
      })
    : 0;

  res.json({
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    activeContacts,
    inactiveContacts,
    contactsLoggedInToday,
  });
}

async function createCustomer(req, res) {
  const body = req.body;
  const assignedAdminId = resolveCustomerAssignedAdminId({
    userRole: req.user.role,
    userId: req.user.id,
    bodyAssignedAdminId: body.assignedAdminId,
  });
  const { client, directConversationId } = await createClientCompanyRecord({
    companyName: optionalString(body.companyName),
    contactPerson: optionalString(body.contactPerson),
    email: optionalString(body.email),
    enablePortal: body.enablePortal === false
      ? false
      : body.enablePortal === true || Boolean(optionalString(body.password)),
    portalEmail: optionalString(body.portalEmail),
    portalPassword: optionalString(body.password),
    phone: optionalString(body.phone),
    address: optionalString(body.location),
    gstNumber: optionalString(body.gstin),
    website: optionalString(body.website),
    industry: optionalString(body.industry),
    status: optionalString(body.status),
    customerType: optionalString(body.type),
    leadId: body.leadId ? Number(body.leadId) : null,
    assignedAdminId,
    createdByUserId: req.user.id,
    createdByLabel: req.user.name,
  });
  res.status(201).json({
    ...(await attachCreatedByUsers([formatClientAsCustomer(client)], [client]))[0],
    directConversationId: directConversationId ?? client.directConversationId ?? null,
  });
}

async function getCustomerById(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const client = await findClientOr404(id, req.user);
  const [installments, invoices, assignedAdmin, createdByUser, hasPayments] = await Promise.all([
    SalesInstallments.find({ customerId: id }).sort({ dueDate: 1 }).lean(),
    SalesInvoices.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
    loadStaffUser(client.assignedAdminId),
    loadStaffUser(resolveCustomerCreatorUserId(client)),
    SalesPayments.exists({ customerId: id }),
  ]);
  const totalSales = sumInvoiceBilled(invoices);
  const outstanding = sumInvoiceOutstanding(invoices);
  res.json({
    ...formatClientAsCustomer(client, { totalSales, outstanding, hasPayments: Boolean(hasPayments) }),
    installments,
    invoices,
    assignedAdmin,
    createdByUser: createdByUser
      ? { id: createdByUser.id, name: createdByUser.name, avatarUrl: createdByUser.avatarUrl ?? null }
      : null,
  });
}

async function updateCustomer(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const client = await findClientOr404(id, req.user);
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

  const clientSet = customerUpdatesToClientSet(updates);
  if (updates.email !== undefined && client.userId) {
    await syncPortalEmailIfLinked({
      userId: client.userId,
      oldContactEmail: client.email,
      newContactEmail: updates.email,
    });
  }

  const updated = Object.keys(clientSet).length
    ? await clientsTable.findOneAndUpdate({ id }, { $set: clientSet }, { new: true }).lean()
    : client;
  const [assignedAdmin, createdByUser] = await Promise.all([
    loadStaffUser(updated.assignedAdminId),
    loadStaffUser(resolveCustomerCreatorUserId(updated)),
  ]);
  res.json({
    ...formatClientAsCustomer(updated),
    assignedAdmin,
    createdByUser: createdByUser
      ? { id: createdByUser.id, name: createdByUser.name, avatarUrl: createdByUser.avatarUrl ?? null }
      : null,
  });
}

async function deleteCustomer(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const client = await findClientOr404(id, req.user);
  const hasPayments = await SalesPayments.exists({ customerId: id });
  if (hasPayments) {
    badRequest(
      "Cannot delete a customer with recorded payments. Set status to inactive instead.",
      "payments",
    );
  }
  await deleteClientCompany(client);
  res.json({ success: true });
}

async function provisionCustomerPortal(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const client = await findClientOr404(id, req.user);
  const body = req.body;

  const { client: updated, portalUserId, directConversationId } = await enablePortalForClientCompany({
    client,
    portalEmail: optionalString(body.portalEmail ?? client.email),
    portalPassword: optionalString(body.password),
    contactPerson: client.contactPerson,
    industry: optionalString(body.industry),
    companyName: optionalString(body.companyName),
    createdByUserId: req.user.id,
    createdByLabel: req.user.name,
  });

  res.status(201).json({
    success: true,
    customerId: id,
    clientId: id,
    portalUserId,
    directConversationId: directConversationId ?? null,
    customer: formatClientAsCustomer(updated),
  });
}

async function getCustomerStatement(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const client = await findClientOr404(id, req.user);
  const [allInvoices, payments] = await Promise.all([
    SalesInvoices.find({ customerId: id }).sort({ createdAt: 1 }).lean(),
    SalesPayments.find({ customerId: id }).sort({ createdAt: 1 }).lean(),
  ]);
  const invoices = allInvoices.filter(isBillableInvoice);
  const totalBilled = sumInvoiceBilled(invoices);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = sumInvoiceOutstanding(invoices);
  res.json({
    customer: formatClientAsCustomer(client),
    invoices,
    payments,
    summary: { totalBilled, totalPaid, outstanding },
  });
}

async function remindCustomer(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const client = await findClientOr404(id, req.user);
  const message =
    optionalString(req.body.message) ?? "You have a pending payment. Please review your account.";

  const invoices = await SalesInvoices.find({ customerId: id })
    .select({ amount: 1, paidAmount: 1, status: 1 })
    .lean();
  const outstanding = sumInvoiceOutstanding(invoices);
  if (outstanding <= 0) {
    badRequest("This customer has no outstanding balance.", "outstanding");
  }
  if (!client.email?.trim()) {
    badRequest("Customer has no email address on file.", "email");
  }

  const emailResult = await sendCustomerPaymentReminderEmail({
    to: client.email,
    recipientName: client.contactPerson,
    companyName: client.companyName,
    outstandingAmount: outstanding,
    message,
  });

  res.json({
    success: true,
    sentTo: client.email,
    message,
    outstanding,
    emailSent: emailResult.sent === true,
    emailReason: emailResult.reason ?? null,
  });
}

async function bootstrapCustomerDiscussion(req, res) {
  const id = parseIdParam(req.params.id, "customer id");
  const client = await findClientOr404(id, req.user);
  if (!client.userId) {
    badRequest("Enable client portal before creating a discussion channel.", "portal");
  }

  const staffUserId = resolveDiscussionStaffUserId({
    assignedAdminId: client.assignedAdminId,
    createdByUserId: client.createdBy ?? req.user.id,
    portalUserId: client.userId,
  });
  if (!staffUserId) {
    badRequest("No valid staff account to own this client discussion.", "staffUserId");
  }

  const directConversationId = await bootstrapClientDirectDiscussion({
    staffUserId,
    portalUserId: client.userId,
    companyName: client.companyName,
    welcomeAuthorId: req.user.id,
    clientId: client.id,
  });
  if (!directConversationId) {
    badRequest("Discussion channel could not be created.", "discussion");
  }

  const refreshed = await clientsTable.findOne({ id }).lean();
  res.json({
    directConversationId,
    customer: formatClientAsCustomer(refreshed),
  });
}

export {
  listCustomers,
  getCustomersSummary,
  createCustomer,
  getCustomerById,
  getCustomerHub,
  updateCustomer,
  deleteCustomer,
  provisionCustomerPortal,
  bootstrapCustomerDiscussion,
  getCustomerStatement,
  remindCustomer,
};
