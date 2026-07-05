import { SalesInvoices, SalesProposals, clientsTable, SalesInstallments, getNextSequence } from "../../models/schema/index.js";
import { runInTx } from "../../lib/db-tx.js";
import { paginateModel } from "../../utils/mongo-list.js";
import { loadProjectNameMap } from "../../utils/sales-project-labels.js";
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
} from "../../utils/sales-totals.js";

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
    if (q) filter.number = { $regex: q, $options: "i" };
  }
  // BDE scope: only see invoices for customers assigned to them
  if (req.user.role === "bde") {
    const myCustomers = await clientsTable.find({ assignedAdminId: req.user.id }).select({ id: 1 }).lean();
    const myCustomerIds = myCustomers.map((c) => c.id);
    if (filter.customerId != null) {
      if (!myCustomerIds.includes(Number(filter.customerId))) {
        filter.customerId = -1;
      }
    } else {
      filter.customerId = { $in: myCustomerIds };
    }
  }
  await SalesInvoices.updateMany(
    { status: "unpaid", dueDate: { $lt: new Date() } },
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
    ? await SalesInstallments.find({ id: { $in: installmentIds } }).select({ id: 1, name: 1, projectId: 1 }).lean()
    : [];
  const installmentMap = new Map(installments.map((i) => [i.id, i]));
  const projectNameMap = await loadProjectNameMap([
    ...items.map((i) => i.projectId),
    ...installments.map((i) => i.projectId),
  ]);
  const invoices = items.map((inv) => {
    const installment = inv.installmentId ? installmentMap.get(inv.installmentId) : null;
    const projectId = inv.projectId ?? installment?.projectId ?? null;
    return {
      ...inv,
      installmentName: installment?.name ?? null,
      projectId,
      projectName: projectId ? projectNameMap.get(projectId) ?? null : null,
    };
  });
  res.json({ invoices, total, page: pg, limit: lim });
}

async function createInvoice(req, res) {
  const body = req.body;
  if (!body.customerId) badRequest("customerId is required.", "customerId");
  if (!body.dueDate) badRequest("dueDate is required.", "dueDate");
  const dueDate = new Date(body.dueDate);
  if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");

  const lineItems = parseLineItems(body.lineItems);
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
      await SalesInstallments.updateOne(
        { id: installmentId, invoiceId: null },
        { $set: { invoiceId: id } },
        { session }
      );
    }
  });
  res.status(201).json(invoice.toObject());
}

async function assertBdeInvoiceAccess(invoice, user) {
  if (user.role !== "bde") return;
  const mine = await clientsTable.findOne({ id: invoice.customerId, assignedAdminId: user.id }).lean();
  if (!mine) notFound("Invoice");
}

async function getInvoiceById(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await SalesInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  await assertBdeInvoiceAccess(invoice, req.user);
  res.json(invoice);
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
  if (body.customerId !== undefined) updates.customerId = Number(body.customerId);
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

  const updated = await SalesInvoices.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function assertBdeInstallmentAccess(installment, user) {
  if (user.role !== "bde") return;
  const mine = await clientsTable.findOne({ id: installment.customerId, assignedAdminId: user.id }).lean();
  if (!mine) notFound("Installment");
}

async function createInvoiceFromInstallment(req, res) {
  const installmentId = parseIdParam(req.params.installmentId, "installment id");
  const installment = await SalesInstallments.findOne({ id: installmentId }).lean();
  if (!installment) notFound("Installment");
  await assertBdeInstallmentAccess(installment, req.user);
  if (installment.invoiceId) {
    badRequest("This installment already has an invoice.", "invoiceId");
  }
  if (installment.dueAmount <= 0) {
    badRequest("Installment amount must be greater than zero.", "dueAmount");
  }
  const body = req.body ?? {};
  const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(installment.dueDate);
  if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");

  let title = installment.name;
  const proposalId = installment.proposalId ?? null;
  let proposal = null;
  if (proposalId) {
    proposal = await SalesProposals.findOne({ id: proposalId }).lean();
    if (proposal?.title) title = `${proposal.title} — ${installment.name}`;
  }

  const amount = installment.dueAmount;
  const calculatedAmount = installment.calculatedAmount ?? installment.dueAmount;
  const totalAdjustment = installment.totalAdjustment ?? 0;
  const adjustedTotal = installment.adjustedTotal ?? null;
  const lineItems = [
    {
      itemId: `inst-${installmentId}`,
      name: installment.name,
      description: proposal ? `From proposal ${proposal.number}` : "",
      quantity: 1,
      unitPrice: amount,
      taxPercent: 0,
    },
  ];
  const [number, id] = await Promise.all([nextInvoiceNumber(), getNextSequence("sales_invoices")]);
  let invoice;
  await runInTx(async (session) => {
    const existing = await SalesInstallments.findOne({ id: installmentId }).session(session).lean();
    if (existing?.invoiceId) {
      badRequest("This installment already has an invoice.", "invoiceId");
    }
    invoice = await SalesInvoices.create(
      [{
        id,
        number,
        title,
        customerId: installment.customerId,
        projectId: installment.projectId ?? null,
        installmentId,
        proposalId,
        lineItems,
        notes: null,
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
    const linked = await SalesInstallments.updateOne(
      { id: installmentId, invoiceId: null },
      { $set: { invoiceId: id } },
      { session }
    );
    if (linked.matchedCount === 0) {
      badRequest("This installment already has an invoice.", "invoiceId");
    }
  });
  res.status(201).json(invoice.toObject());
}

async function createInvoiceFromProposal(req, res) {
  badRequest(
    "Create installments from the approved proposal first, then generate an invoice for each installment.",
    "flow"
  );
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
  createInvoiceFromProposal,
  createInvoiceFromInstallment,
};
