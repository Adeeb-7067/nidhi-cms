import {
  SalesCustomers,
  SalesInstallments,
  SalesInvoices,
  SalesPayments,
  SalesProposals,
  clientsTable,
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
import { createClientPortalUser, updateClientPortalEmail } from "../../services/client-portal.js";
import { sendCustomerPaymentReminderEmail } from "../../lib/email.js";

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
  const [installments, invoices] = await Promise.all([
    SalesInstallments.find({ customerId: id }).sort({ dueDate: 1 }).lean(),
    SalesInvoices.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
  ]);
  const totalSales = invoices.reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.reduce((s, i) => s + Math.max(0, i.amount - i.paidAmount), 0);
  res.json({ ...customer, installments, invoices, totalSales, outstanding });
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

  if (Object.keys(updates).length) {
    await syncLinkedClientRecord(customer, updates);
  }

  const updated = await SalesCustomers.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
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
  updateCustomer,
  deleteCustomer,
  provisionCustomerPortal,
  getCustomerStatement,
  remindCustomer,
};
