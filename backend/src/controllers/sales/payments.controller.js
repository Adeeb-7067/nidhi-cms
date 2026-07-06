import {
  SalesPayments,
  SalesInvoices,
  SalesInstallments,
  SalesProposals,
  clientsTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString } from "../../utils/route-errors.js";
import { runInTx } from "../../lib/db-tx.js";
import {
  loadProjectNameMap,
  resolvePaymentInstallment,
  resolveSalesProjectId,
  collectInstallmentIdsFromPayments,
  collectProposalIdsFromRecords,
} from "../../utils/sales-project-labels.js";
import {
  assertBdeOwnsCustomerById,
  bdeOwnsCustomer,
  findBdeOwnedCustomerIds,
} from "../../utils/sales-bde-customer-scope.js";

async function applyBdePaymentListScope(req, filter) {
  if (req.user.role !== "bde") return;

  const customerId = req.query.customerId ? Number(req.query.customerId) : null;
  const invoiceId = req.query.invoiceId ? Number(req.query.invoiceId) : null;
  const installmentId = req.query.installmentId ? Number(req.query.installmentId) : null;

  if (customerId != null && Number.isFinite(customerId)) {
    await assertBdeOwnsCustomerById(clientsTable, req.user, customerId, "Customer");
    return;
  }

  if (invoiceId != null && Number.isFinite(invoiceId)) {
    const invoice = await SalesInvoices.findOne({ id: invoiceId }).select({ customerId: 1 }).lean();
    if (!invoice) notFound("Invoice");
    await assertBdeOwnsCustomerById(clientsTable, req.user, invoice.customerId, "Invoice");
    return;
  }

  if (installmentId != null && Number.isFinite(installmentId)) {
    const installment = await SalesInstallments.findOne({ id: installmentId })
      .select({ customerId: 1 })
      .lean();
    if (!installment) notFound("Installment");
    await assertBdeOwnsCustomerById(clientsTable, req.user, installment.customerId, "Installment");
    return;
  }

  const myCustomerIds = await findBdeOwnedCustomerIds(clientsTable, req.user.id);
  filter.customerId = { $in: myCustomerIds.length ? myCustomerIds : [-1] };
}

async function listPayments(req, res) {
  const { search } = req.query;
  const { page, limit } = parsePagination(req.query);
  const filter = {};
  if (req.query.invoiceId) filter.invoiceId = Number(req.query.invoiceId);
  if (req.query.installmentId) filter.installmentId = Number(req.query.installmentId);
  if (req.query.customerId) filter.customerId = Number(req.query.customerId);
  if (search) {
    const q = String(search).trim();
    if (q) {
      filter.$or = [
        { receiptNumber: { $regex: q, $options: "i" } },
        { paymentMethod: { $regex: q, $options: "i" } },
        { transactionId: { $regex: q, $options: "i" } },
        { note: { $regex: q, $options: "i" } },
      ];
    }
  }
  await applyBdePaymentListScope(req, filter);

  const [payments, total] = await Promise.all([
    SalesPayments.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SalesPayments.countDocuments(filter),
  ]);

  const invoiceIds = [...new Set(payments.map((p) => p.invoiceId))];
  const invoices = invoiceIds.length
    ? await SalesInvoices.find({ id: { $in: invoiceIds } }).lean()
    : [];
  const installmentIds = collectInstallmentIdsFromPayments(payments, invoices);
  const recorderIds = [...new Set(payments.map((p) => p.recordedBy).filter(Boolean))];
  const installments = installmentIds.length
    ? await SalesInstallments.find({ id: { $in: installmentIds } })
      .select({ id: 1, name: 1, projectId: 1, proposalId: 1 })
      .lean()
    : [];
  const proposalIds = collectProposalIdsFromRecords(invoices, installments);
  const [proposals, recorders] = await Promise.all([
    proposalIds.length
      ? SalesProposals.find({ id: { $in: proposalIds } }).select({ id: 1, projectId: 1 }).lean()
      : [],
    recorderIds.length
      ? usersTable.find({ id: { $in: recorderIds } }).select({ id: 1, name: 1, avatarUrl: 1 }).lean()
      : [],
  ]);
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
  const installmentMap = new Map(installments.map((i) => [i.id, i]));
  const proposalMap = new Map(proposals.map((p) => [p.id, p]));
  const recorderMap = new Map(
    recorders.map((u) => [u.id, { name: u.name, avatarUrl: u.avatarUrl ?? null }]),
  );
  const projectNameMap = await loadProjectNameMap([
    ...invoices.map((i) => i.projectId),
    ...installments.map((i) => i.projectId),
    ...proposals.map((p) => p.projectId),
  ]);

  const rows = payments.map((p) => {
    const invoice = invoiceMap.get(p.invoiceId);
    const installment = resolvePaymentInstallment(p, invoice, installmentMap);
    const proposalId = installment?.proposalId ?? invoice?.proposalId ?? null;
    const proposal = proposalId ? proposalMap.get(proposalId) ?? null : null;
    const projectId = resolveSalesProjectId({ invoice, installment, proposal });
    return {
      ...p,
      invoiceStatus: invoice?.status ?? "unknown",
      invoiceNumber: invoice?.number ?? null,
      installmentName: installment?.name ?? null,
      projectId,
      projectName: projectId ? projectNameMap.get(projectId) ?? null : null,
      recordedByName: recorderMap.get(p.recordedBy)?.name ?? null,
      recordedByAvatarUrl: recorderMap.get(p.recordedBy)?.avatarUrl ?? null,
    };
  });

  res.json({ payments: rows, total, page, limit });
}

async function nextReceiptNumber() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`rec_num_${year}`);
  return `REC-${year}-${String(seq).padStart(4, "0")}`;
}

function deriveInvoiceStatus(invoice, newPaidAmount) {
  if (newPaidAmount >= invoice.amount) return "paid";
  if (newPaidAmount > 0) return "partial";
  return "unpaid";
}

function deriveInstallmentStatus(installment, newPaidAmount) {
  if (newPaidAmount >= installment.dueAmount) return "paid";
  if (newPaidAmount > 0) return "partial";
  return "pending";
}

async function assertBdePaymentAccess(payment, user) {
  if (user.role !== "bde") return;
  const client = await clientsTable.findOne({ id: payment.customerId }).lean();
  if (!client || !bdeOwnsCustomer(client, user.id)) notFound("Receipt");
}

async function recordPayment(req, res) {
  const body = req.body;
  if (!body.invoiceId) badRequest("invoiceId is required.", "invoiceId");
  if (body.amount == null) badRequest("amount is required.", "amount");
  if (!body.paymentMethod) badRequest("paymentMethod is required.", "paymentMethod");
  const invoiceId = Number(body.invoiceId);
  let installmentId = body.installmentId ? Number(body.installmentId) : null;
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) badRequest("amount must be a positive number.", "amount");

  const [receiptNumber, id] = await Promise.all([
    nextReceiptNumber(),
    getNextSequence("sales_payments"),
  ]);

  let newStatus;
  await runInTx(async (session) => {
    const invoice = await SalesInvoices.findOne({ id: invoiceId }).session(session).lean();
    if (!invoice) notFound("Invoice");
    if (req.user.role === "bde") {
      const client = await clientsTable.findOne({ id: invoice.customerId }).session(session).lean();
      if (!client || !bdeOwnsCustomer(client, req.user.id)) notFound("Invoice");
    }
    if (invoice.status === "cancelled") badRequest("This invoice has been cancelled.", "invoiceId");
    if (invoice.status === "paid") badRequest("This invoice is already fully paid.", "invoiceId");

    // Milestone invoices are 1:1 with an installment — apply payment to both ledgers.
    if (!installmentId && invoice.installmentId) {
      installmentId = invoice.installmentId;
    }

    // If paying against a specific installment, validate and update it too
    if (installmentId) {
      const inst = await SalesInstallments.findOne({ id: installmentId }).session(session).lean();
      if (!inst) notFound("Installment");
      if (inst.invoiceId && inst.invoiceId !== invoiceId) {
        badRequest("Installment does not belong to this invoice.", "installmentId");
      }
      if (inst.status === "paid") badRequest("This installment is already fully paid.", "installmentId");

      const instRemaining = inst.dueAmount - inst.paidAmount;
      const appliedToInst = Math.min(amount, instRemaining);
      const newInstPaid = inst.paidAmount + appliedToInst;
      const newInstStatus = deriveInstallmentStatus(inst, newInstPaid);

      await SalesInstallments.updateOne(
        { id: installmentId },
        { $set: { paidAmount: newInstPaid, status: newInstStatus } },
        { session }
      );
    }

    // Update invoice paidAmount regardless
    const remaining = invoice.amount - invoice.paidAmount;
    if (amount > remaining) {
      badRequest(`Payment exceeds remaining balance of ${remaining}.`, "amount");
    }
    const appliedAmount = amount;
    const newPaidAmount = invoice.paidAmount + appliedAmount;
    newStatus = deriveInvoiceStatus(invoice, newPaidAmount);

    await SalesPayments.create(
      [{
        id,
        invoiceId,
        installmentId,
        customerId: invoice.customerId,
        amount: appliedAmount,
        paymentMethod: body.paymentMethod,
        transactionId: optionalString(body.transactionId) ?? null,
        note: optionalString(body.note) ?? null,
        recordedBy: req.user.id,
        receiptNumber,
      }],
      { session }
    );
    await SalesInvoices.updateOne(
      { id: invoiceId },
      { $set: { paidAmount: newPaidAmount, status: newStatus } },
      { session }
    );
  });

  const payment = await SalesPayments.findOne({ id }).lean();
  res.status(201).json({ ...payment, invoiceStatus: newStatus });
}

async function enrichInvoiceForReceipt(invoice, paymentInstallmentId = null) {
  if (!invoice) return null;
  const installmentId = paymentInstallmentId ?? invoice.installmentId ?? null;
  const installment = installmentId
    ? await SalesInstallments.findOne({ id: installmentId })
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
  return {
    ...invoice,
    installmentName: installment?.name ?? null,
    projectId,
    projectName: projectId ? projectNameMap.get(projectId) ?? null : null,
  };
}

async function getReceiptById(req, res) {
  const id = parseIdParam(req.params.id, "payment id");
  const payment = await SalesPayments.findOne({ id }).lean();
  if (!payment) notFound("Receipt");
  await assertBdePaymentAccess(payment, req.user);
  const [invoice, customer, installment] = await Promise.all([
    SalesInvoices.findOne({ id: payment.invoiceId }).lean(),
    clientsTable.findOne({ id: payment.customerId }).lean(),
    payment.installmentId
      ? SalesInstallments.findOne({ id: payment.installmentId }).lean()
      : Promise.resolve(null),
  ]);
  const enrichedInvoice = await enrichInvoiceForReceipt(invoice, payment.installmentId);
  res.json({ payment, invoice: enrichedInvoice, customer, installment });
}

export { listPayments, recordPayment, getReceiptById };
