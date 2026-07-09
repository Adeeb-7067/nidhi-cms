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
import { applyPaymentInTx, applyInstallmentPaymentInTx, repairPaymentInvoiceLinkInTx } from "../../services/sales/payment-ledger.service.js";
import { mirrorSalesPaymentToFinanceInTx } from "../../services/finance/sales-payment-sync.service.js";
import {
  loadProjectNameMap,
  resolvePaymentInstallment,
  resolveSalesProjectId,
  collectInstallmentIdsFromPayments,
  collectProposalIdsFromRecords,
} from "../../utils/sales-project-labels.js";
import {
  assertBdeOwnsCustomerById,
  assertBdeInstallmentAccess,
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
    const installment = await SalesInstallments.findOne({ id: installmentId }).lean();
    if (!installment) notFound("Installment");
    await assertBdeInstallmentAccess(clientsTable, SalesProposals, installment, req.user, "Installment");
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

  const invoiceIds = [...new Set(payments.flatMap((p) => [p.invoiceId, p.paymentInvoiceId].filter(Boolean)))];
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

  const needsRepair = payments.filter((p) => p.installmentId && !p.paymentInvoiceId);
  if (needsRepair.length) {
    for (const p of needsRepair) {
      await runInTx((session) => repairPaymentInvoiceLinkInTx(session, p.id));
    }
    const repaired = await SalesPayments.find({ id: { $in: needsRepair.map((p) => p.id) } }).lean();
    const extraInvoiceIds = repaired
      .flatMap((p) => [p.invoiceId, p.paymentInvoiceId])
      .filter((id) => id && !invoiceMap.has(id));
    if (extraInvoiceIds.length) {
      const extraInvoices = await SalesInvoices.find({ id: { $in: extraInvoiceIds } }).lean();
      for (const inv of extraInvoices) invoiceMap.set(inv.id, inv);
    }
    for (const row of repaired) {
      const idx = payments.findIndex((p) => p.id === row.id);
      if (idx >= 0) payments[idx] = row;
    }
  }

  const rows = payments.map((p) => {
    const masterInvoice = invoiceMap.get(p.invoiceId);
    const paymentInvoice = p.paymentInvoiceId ? invoiceMap.get(p.paymentInvoiceId) : null;
    const displayInvoice = paymentInvoice ?? masterInvoice;
    const installment = resolvePaymentInstallment(p, masterInvoice, installmentMap);
    const proposalId = installment?.proposalId ?? masterInvoice?.proposalId ?? null;
    const proposal = proposalId ? proposalMap.get(proposalId) ?? null : null;
    const projectId = resolveSalesProjectId({ invoice: masterInvoice, installment, proposal });
    return {
      ...p,
      invoiceStatus: displayInvoice?.status ?? "unknown",
      invoiceNumber: displayInvoice?.number ?? null,
      masterInvoiceId: masterInvoice?.id ?? p.invoiceId,
      masterInvoiceNumber: masterInvoice?.number ?? null,
      masterInvoiceStatus: masterInvoice?.status ?? null,
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

async function assertBdePaymentAccess(payment, user) {
  if (user.role !== "bde") return;
  const client = await clientsTable.findOne({ id: payment.customerId }).lean();
  if (!client || !bdeOwnsCustomer(client, user.id)) notFound("Receipt");
}

async function recordPayment(req, res) {
  const body = req.body;
  if (body.amount == null) badRequest("amount is required.", "amount");
  if (!body.paymentMethod) badRequest("paymentMethod is required.", "paymentMethod");

  let invoiceId = body.invoiceId != null ? Number(body.invoiceId) : null;
  let installmentId = body.installmentId != null ? Number(body.installmentId) : null;
  if (!invoiceId && !installmentId) {
    badRequest("invoiceId or installmentId is required.", "invoiceId");
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) badRequest("amount must be a positive number.", "amount");

  if (!installmentId && invoiceId) {
    const selected = await SalesInvoices.findOne({ id: invoiceId }).select({ installmentId: 1 }).lean();
    if (selected?.installmentId) installmentId = selected.installmentId;
  }

  if (installmentId) {
    const installment = await SalesInstallments.findOne({ id: installmentId }).lean();
    if (!installment) notFound("Installment");
    await assertBdeInstallmentAccess(clientsTable, SalesProposals, installment, req.user, "Installment");
  } else if (invoiceId) {
    const invoice = await SalesInvoices.findOne({ id: invoiceId }).lean();
    if (!invoice) notFound("Invoice");
    if (req.user.role === "bde") {
      await assertBdeOwnsCustomerById(clientsTable, req.user, invoice.customerId, "Invoice");
    }
  }

  const [receiptNumber, id] = await Promise.all([
    nextReceiptNumber(),
    getNextSequence("sales_payments"),
  ]);

  let newStatus;
  let invoiceCreated = false;

  await runInTx(async (session) => {
    if (installmentId) {
      const result = await applyInstallmentPaymentInTx(session, {
        installmentId,
        amount,
        paymentMethod: body.paymentMethod,
        transactionId: body.transactionId,
        note: body.note,
        recordedBy: req.user.id,
        receiptNumber,
        paymentId: id,
        bdeUser: req.user,
      });
      newStatus = result.invoiceStatus;
      invoiceCreated = result.invoiceCreated;
      return;
    }

    const result = await applyPaymentInTx(session, {
      invoiceId,
      installmentId: null,
      amount,
      paymentMethod: body.paymentMethod,
      transactionId: body.transactionId,
      note: body.note,
      recordedBy: req.user.id,
      receiptNumber,
      paymentId: id,
      bdeUser: req.user,
    });
    newStatus = result.invoiceStatus;
  });

  const payment = await SalesPayments.findOne({ id }).lean();
  try {
    await runInTx((session) => mirrorSalesPaymentToFinanceInTx(session, payment));
  } catch (syncErr) {
    console.error("[sales-payment] finance sync failed for payment", id, syncErr);
  }

  res.status(201).json({
    ...payment,
    invoiceStatus: newStatus,
    invoiceCreated,
  });
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
  let payment = await SalesPayments.findOne({ id }).lean();
  if (!payment) notFound("Receipt");
  await assertBdePaymentAccess(payment, req.user);

  if (payment.installmentId) {
    await runInTx((session) => repairPaymentInvoiceLinkInTx(session, id));
    payment = await SalesPayments.findOne({ id }).lean();
  }

  const [invoice, customer, installment] = await Promise.all([
    SalesInvoices.findOne({ id: payment.paymentInvoiceId ?? payment.invoiceId }).lean(),
    clientsTable.findOne({ id: payment.customerId }).lean(),
    payment.installmentId
      ? SalesInstallments.findOne({ id: payment.installmentId }).lean()
      : Promise.resolve(null),
  ]);
  const enrichedInvoice = await enrichInvoiceForReceipt(invoice, payment.installmentId);
  const masterInvoice = payment.paymentInvoiceId && payment.invoiceId !== payment.paymentInvoiceId
    ? await SalesInvoices.findOne({ id: payment.invoiceId }).lean()
    : null;
  res.json({
    payment,
    invoice: enrichedInvoice,
    masterInvoice: masterInvoice ? await enrichInvoiceForReceipt(masterInvoice, payment.installmentId) : null,
    customer,
    installment,
  });
}

export { listPayments, recordPayment, getReceiptById };
