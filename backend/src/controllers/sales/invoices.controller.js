import {
  SalesInvoices,
  SalesProposals,
  SalesPayments,
  clientsTable,
  SalesInstallments,
  projectsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { runInTx } from "../../lib/db-tx.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  loadProjectNameMap,
  resolveSalesProjectId,
  collectProposalIdsFromRecords,
} from "../../utils/sales-project-labels.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";
import {
  calcLineItemsTotal,
  resolveFinalTotal,
  parseAdjustedTotal,
  parseTotalAdjustment,
  assertPositiveInvoiceAmount,
  assertValidInvoiceLineItems,
} from "../../utils/sales-totals.js";
import {
  bdeOwnsCustomer,
  findBdeOwnedCustomerIds,
  assertBdeOwnsCustomerById,
  assertBdeInstallmentAccess,
} from "../../utils/sales-bde-customer-scope.js";
import { ensureInvoiceForInstallment, resolveInstallmentInvoiceDueDate } from "../../services/sales/installment-billing.service.js";
import { escapeRegex } from "../../utils/regex.js";

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`inv_num_${year}`);
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

function parseLineItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item, i) => ({
    itemId: item.itemId ?? `item-${i}-${Date.now()}`,
    name: String(item.name ?? ""),
    description: String(item.description ?? ""),
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    taxPercent: Math.min(100, Math.max(0, Number(item.taxPercent) || 0)),
  }));
}

async function listInvoices(req, res) {
  const { status, customerId, projectId, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customerId = Number(customerId);
  if (projectId) filter.projectId = Number(projectId);
  if (search) {
    const q = String(search).trim();
    if (q) {
      const re = { $regex: escapeRegex(q), $options: "i" };
      const matchingCustomers = await clientsTable
        .find({ $or: [{ companyName: re }, { contactPerson: re }, { email: re }] })
        .select({ id: 1 })
        .lean();
      const customerIds = matchingCustomers.map((c) => c.id);
      filter.$or = [{ number: re }, { customerId: { $in: customerIds } }];
    }
  }
  // BDE scope: only see invoices for customers assigned to them
  if (req.user.role === "bde") {
    const myCustomerIds = await findBdeOwnedCustomerIds(clientsTable, req.user.id);
    if (filter.customerId != null) {
      if (!myCustomerIds.includes(Number(filter.customerId))) {
        filter.customerId = -1;
      }
    } else {
      filter.customerId = { $in: myCustomerIds };
    }
  }
  await SalesInvoices.updateMany(
    { amount: { $lte: 0 }, status: { $nin: ["cancelled", "paid"] } },
    { $set: { status: "paid" } }
  );
  await SalesInvoices.updateMany(
    { status: { $in: ["unpaid", "partial"] }, dueDate: { $lt: new Date() }, amount: { $gt: 0 } },
    { $set: { status: "overdue" } }
  );
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesInvoices,
    filter,
    { page, limit, skip },
    { sort: { createdAt: -1 } }
  );
  const installmentIds = [...new Set(items.map((i) => i.installmentId).filter(Boolean))];
  const installments = installmentIds.length
    ? await SalesInstallments.find({ id: { $in: installmentIds } }).select({ id: 1, name: 1, projectId: 1, proposalId: 1 }).lean()
    : [];
  const installmentMap = new Map(installments.map((i) => [i.id, i]));
  const proposalIds = collectProposalIdsFromRecords(items, installments);
  const proposals = proposalIds.length
    ? await SalesProposals.find({ id: { $in: proposalIds } }).select({ id: 1, projectId: 1 }).lean()
    : [];
  const proposalMap = new Map(proposals.map((p) => [p.id, p]));
  const projectNameMap = await loadProjectNameMap([
    ...items.map((i) => i.projectId),
    ...installments.map((i) => i.projectId),
    ...proposals.map((p) => p.projectId),
  ]);
  const customerIds = [...new Set(items.map((i) => i.customerId))];
  const customerRows = customerIds.length
    ? await clientsTable.find({ id: { $in: customerIds } }).select({ id: 1, companyName: 1 }).lean()
    : [];
  const customerNameMap = new Map(customerRows.map((c) => [c.id, c.companyName]));
  const invoices = items.map((inv) => {
    const installment = inv.installmentId ? installmentMap.get(inv.installmentId) : null;
    const proposalId = installment?.proposalId ?? inv.proposalId ?? null;
    const proposal = proposalId ? proposalMap.get(proposalId) ?? null : null;
    const projectId = resolveSalesProjectId({ invoice: inv, installment, proposal });
    return {
      ...inv,
      installmentName: installment?.name ?? null,
      projectId,
      projectName: projectId ? projectNameMap.get(projectId) ?? null : null,
      customerName: customerNameMap.get(inv.customerId) ?? null,
    };
  });
  res.json({ invoices, total, page: pg, limit: lim });
}

async function createInvoice(req, res) {
  const body = req.body;
  if (!body.customerId) badRequest("customerId is required.", "customerId");
  await assertBdeOwnsCustomerById(clientsTable, req.user, body.customerId);
  const customer = await clientsTable.findOne({ id: Number(body.customerId) }).select({ id: 1 }).lean();
  if (!customer) notFound("Customer");
  if (!body.dueDate) badRequest("dueDate is required.", "dueDate");
  const dueDate = new Date(body.dueDate);
  if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");

  const lineItems = parseLineItems(body.lineItems);
  if (lineItems.length > 0) {
    assertValidInvoiceLineItems(lineItems, badRequest);
  }
  const totalAdjustment = parseTotalAdjustment(body.totalAdjustment) ?? 0;
  const adjustedTotal = parseAdjustedTotal(body.adjustedTotal) ?? null;

  let calculatedAmount;
  if (lineItems.length > 0) {
    calculatedAmount = calcLineItemsTotal(lineItems, 0);
  } else if (body.calculatedAmount != null) {
    calculatedAmount = Number(body.calculatedAmount);
  } else if (body.amount != null) {
    calculatedAmount = Number(body.amount);
  } else {
    badRequest("amount or lineItems is required.", "amount");
  }

  const amount = resolveFinalTotal(calculatedAmount, totalAdjustment, adjustedTotal);
  assertPositiveInvoiceAmount(amount, badRequest);
  const installmentId = body.installmentId ? Number(body.installmentId) : null;
  if (installmentId) {
    const inst = await SalesInstallments.findOne({ id: installmentId }).lean();
    if (!inst) badRequest("installmentId references a non-existent installment.", "installmentId");
    if (inst.invoiceId) badRequest("This installment already has an invoice.", "installmentId");
    if (inst.customerId !== Number(body.customerId)) {
      badRequest("Installment belongs to a different customer.", "installmentId");
    }
  }

  const [number, id] = await Promise.all([nextInvoiceNumber(), getNextSequence("sales_invoices")]);
  let invoice;
  await runInTx(async (session) => {
    invoice = await SalesInvoices.create(
      [{
        id,
        number,
        title: body.title?.trim() || null,
        customerId: Number(body.customerId),
        projectId: body.projectId ? Number(body.projectId) : null,
        installmentId,
        proposalId: body.proposalId ? Number(body.proposalId) : null,
        lineItems,
        notes: body.notes?.trim() || null,
        terms: body.terms?.trim() || null,
        amount,
        calculatedAmount: Math.round(calculatedAmount),
        totalAdjustment,
        adjustedTotal,
        paidAmount: 0,
        status: "unpaid",
        dueDate,
      }],
      { session }
    );
    invoice = invoice[0];
    if (installmentId) {
      const linkResult = await SalesInstallments.updateOne(
        { id: installmentId, invoiceId: null },
        { $set: { invoiceId: id } },
        { session }
      );
      if (linkResult.matchedCount === 0) {
        badRequest("This installment already has an invoice.", "installmentId");
      }
    }
  });
  res.status(201).json(invoice.toObject());
}

async function assertBdeInvoiceAccess(invoice, user) {
  if (user.role !== "bde") return;
  const client = await clientsTable.findOne({ id: invoice.customerId }).lean();
  if (!client || !bdeOwnsCustomer(client, user.id)) notFound("Invoice");
}

async function getInvoiceById(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await SalesInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  await assertBdeInvoiceAccess(invoice, req.user);

  const installment = invoice.installmentId
    ? await SalesInstallments.findOne({ id: invoice.installmentId })
        .select({ id: 1, name: 1, projectId: 1, proposalId: 1 })
        .lean()
    : null;
  const proposalId = installment?.proposalId ?? invoice.proposalId ?? null;
  const proposal = proposalId
    ? await SalesProposals.findOne({ id: proposalId }).select({ id: 1, projectId: 1 }).lean()
    : null;
  const projectId = resolveSalesProjectId({ invoice, installment, proposal });
  const projectNameMap = await loadProjectNameMap([
    invoice.projectId,
    installment?.projectId,
    proposal?.projectId,
  ].filter(Boolean));
  const customer = await clientsTable.findOne({ id: invoice.customerId }).select({ companyName: 1 }).lean();

  res.json({
    ...invoice,
    installmentName: installment?.name ?? null,
    projectId,
    projectName: projectId ? projectNameMap.get(projectId) ?? null : null,
    customerName: customer?.companyName ?? null,
  });
}

async function updateInvoice(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await SalesInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  await assertBdeInvoiceAccess(invoice, req.user);
  if (invoice.status === "cancelled") {
    badRequest("Cancelled invoices cannot be edited.", "status");
  }
  const body = req.body;
  const updates = {};
  const amountFieldsTouched =
    body.amount !== undefined ||
    body.calculatedAmount !== undefined ||
    body.totalAdjustment !== undefined ||
    body.adjustedTotal !== undefined ||
    body.lineItems !== undefined;
  if (invoice.installmentId && amountFieldsTouched) {
    badRequest(
      "Cannot change a milestone invoice amount here. Update the linked installment instead.",
      "amount"
    );
  }

  // Core editable fields
  if (body.title !== undefined) updates.title = body.title?.trim() || null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.terms !== undefined) updates.terms = body.terms?.trim() || null;
  if (body.customerId !== undefined) {
    badRequest("Use POST /sales/invoices/:id/reassign-customer to change the customer.", "customerId");
  }
  if (body.projectId !== undefined) updates.projectId = body.projectId ? Number(body.projectId) : null;
  if (body.installmentId !== undefined) updates.installmentId = body.installmentId ? Number(body.installmentId) : null;
  if (body.proposalId !== undefined) updates.proposalId = body.proposalId ? Number(body.proposalId) : null;

  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (isNaN(d.getTime())) badRequest("dueDate is invalid.", "dueDate");
    updates.dueDate = d;
  }
  if (body.status !== undefined) {
    badRequest("Use POST /sales/invoices/:id/cancel to cancel an invoice.", "status");
  }

  // Line items — recalculate amount when provided
  if (body.lineItems !== undefined) {
    const lineItems = parseLineItems(body.lineItems);
    if (lineItems.length > 0) {
      assertValidInvoiceLineItems(lineItems, badRequest);
    }
    updates.lineItems = lineItems;
    const fromItems = lineItems.length > 0 ? calcLineItemsTotal(lineItems, 0) : invoice.calculatedAmount ?? invoice.amount;
    const totalAdjustment = body.totalAdjustment !== undefined
      ? parseTotalAdjustment(body.totalAdjustment)
      : invoice.totalAdjustment ?? 0;
    const adjustedTotal = body.adjustedTotal !== undefined
      ? parseAdjustedTotal(body.adjustedTotal)
      : invoice.adjustedTotal ?? null;
    updates.calculatedAmount = Math.round(fromItems);
    updates.totalAdjustment = totalAdjustment;
    updates.adjustedTotal = adjustedTotal;
    updates.amount = resolveFinalTotal(fromItems, totalAdjustment, adjustedTotal);
  } else if (body.amount !== undefined || body.calculatedAmount !== undefined || body.totalAdjustment !== undefined || body.adjustedTotal !== undefined) {
    // Amount-only edit (legacy / from detail page adjust card)
    const calculatedAmount = body.calculatedAmount != null
      ? Number(body.calculatedAmount)
      : invoice.calculatedAmount ?? invoice.amount;
    const totalAdjustment = body.totalAdjustment !== undefined
      ? parseTotalAdjustment(body.totalAdjustment)
      : invoice.totalAdjustment ?? 0;
    const adjustedTotal = body.adjustedTotal !== undefined
      ? parseAdjustedTotal(body.adjustedTotal)
      : invoice.adjustedTotal ?? null;
    if (body.amount !== undefined && body.calculatedAmount === undefined && body.totalAdjustment === undefined && body.adjustedTotal === undefined) {
      updates.amount = Number(body.amount);
    } else {
      updates.calculatedAmount = Math.round(calculatedAmount);
      updates.totalAdjustment = totalAdjustment;
      updates.adjustedTotal = adjustedTotal;
      updates.amount = resolveFinalTotal(calculatedAmount, totalAdjustment, adjustedTotal);
    }
  }

  const nextAmount = updates.amount ?? invoice.amount;
  if (amountFieldsTouched || body.amount !== undefined) {
    assertPositiveInvoiceAmount(nextAmount, badRequest);
  }
  if (nextAmount < (invoice.paidAmount ?? 0)) {
    badRequest("Invoice amount cannot be less than the amount already received.", "amount");
  }

  const updated = await SalesInvoices.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function createInvoiceFromInstallment(req, res) {
  const installmentId = parseIdParam(req.params.installmentId, "installment id");
  const installment = await SalesInstallments.findOne({ id: installmentId }).lean();
  if (!installment) notFound("Installment");
  await assertBdeInstallmentAccess(clientsTable, SalesProposals, installment, req.user);
  if (installment.invoiceId) {
    const existing = await SalesInvoices.findOne({ id: installment.invoiceId }).lean();
    if (existing) return res.status(200).json(existing);
    badRequest("This installment already has an invoice.", "invoiceId");
  }
  if (installment.dueAmount <= 0) {
    badRequest("Installment amount must be greater than zero.", "dueAmount");
  }
  const body = req.body ?? {};
  resolveInstallmentInvoiceDueDate(installment, body.dueDate);

  let invoice;
  let created = false;
  await runInTx(async (session) => {
    const result = await ensureInvoiceForInstallment(installmentId, session, { dueDate: body.dueDate });
    invoice = result.invoice;
    created = result.created;
  });

  res.status(created ? 201 : 200).json(invoice);
}

async function createInvoiceFromProposal(req, res) {
  badRequest(
    "Create installments from the approved proposal first, then generate an invoice for each installment.",
    "flow"
  );
}

async function reassignInvoiceCustomer(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const newCustomerId = parseIdParam(req.body?.customerId, "customer id");
  const invoice = await SalesInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  await assertBdeInvoiceAccess(invoice, req.user);
  if (invoice.status === "cancelled") {
    badRequest("Cancelled invoices cannot be reassigned.", "status");
  }
  if (invoice.customerId === newCustomerId) {
    badRequest("Invoice is already assigned to this customer.", "customerId");
  }

  const client = await clientsTable.findOne({ id: newCustomerId }).lean();
  if (!client) notFound("Customer");
  if (req.user.role === "bde" && !bdeOwnsCustomer(client, req.user.id)) {
    notFound("Customer");
  }

  if (invoice.projectId) {
    const project = await projectsTable.findOne({ id: invoice.projectId }).lean();
    const projectClientId = project?.clientId ?? project?.companyId ?? null;
    if (projectClientId && projectClientId !== newCustomerId) {
      badRequest(
        "This invoice's project belongs to a different customer.",
        "customerId",
      );
    }
  }

  await runInTx(async (session) => {
    await SalesInvoices.updateOne(
      { id },
      { $set: { customerId: newCustomerId } },
      { session },
    );
    await SalesPayments.updateMany(
      { invoiceId: id },
      { $set: { customerId: newCustomerId } },
      { session },
    );
    if (invoice.installmentId) {
      await SalesInstallments.updateOne(
        { id: invoice.installmentId },
        { $set: { customerId: newCustomerId } },
        { session },
      );
    }
  });

  const updated = await SalesInvoices.findOne({ id }).lean();
  res.json(updated);
}

async function cancelInvoice(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await SalesInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  await assertBdeInvoiceAccess(invoice, req.user);
  if (invoice.status === "cancelled") {
    badRequest("This invoice is already cancelled.", "status");
  }
  if (invoice.status === "paid" || (invoice.paidAmount ?? 0) > 0) {
    badRequest("Invoices with recorded payments cannot be cancelled.", "paidAmount");
  }

  const reason = optionalString(req.body?.reason) ?? null;
  const cancelledAt = new Date();
  let updated;

  await runInTx(async (session) => {
    updated = await SalesInvoices.findOneAndUpdate(
      { id, status: { $ne: "cancelled" }, paidAmount: 0 },
      {
        $set: {
          status: "cancelled",
          cancelledAt,
          cancelReason: reason,
          cancelledBy: req.user.id,
        },
      },
      { new: true, session }
    ).lean();
    if (!updated) {
      badRequest("Invoices with recorded payments cannot be cancelled.", "paidAmount");
    }
    if (invoice.installmentId) {
      await SalesInstallments.updateOne(
        { id: invoice.installmentId, invoiceId: id },
        { $set: { invoiceId: null } },
        { session }
      );
    }
  });

  res.json(updated);
}

export {
  listInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  cancelInvoice,
  reassignInvoiceCustomer,
  createInvoiceFromProposal,
  createInvoiceFromInstallment,
};
