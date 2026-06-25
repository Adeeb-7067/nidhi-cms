import {
  SalesPayments,
  SalesInvoices,
  SalesCustomers,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString } from "../../utils/route-errors.js";

async function listPayments(req, res) {
  const { page, limit } = parsePagination(req.query);
  const filter = {};
  if (req.query.invoiceId) filter.invoiceId = Number(req.query.invoiceId);
  if (req.query.customerId) filter.customerId = Number(req.query.customerId);

  const [payments, total] = await Promise.all([
    SalesPayments.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SalesPayments.countDocuments(filter),
  ]);

  // hydrate invoiceStatus from latest invoice state
  const invoiceIds = [...new Set(payments.map((p) => p.invoiceId))];
  const invoices = invoiceIds.length
    ? await SalesInvoices.find({ id: { $in: invoiceIds } }).lean()
    : [];
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  const rows = payments.map((p) => ({
    ...p,
    invoiceStatus: invoiceMap.get(p.invoiceId)?.status ?? "unknown",
    invoiceNumber: invoiceMap.get(p.invoiceId)?.number ?? null,
  }));

  res.json({ payments: rows, total, page, limit });
}

async function nextReceiptNumber() {
  const year = new Date().getFullYear();
  const count = await SalesPayments.countDocuments({ receiptNumber: { $regex: `^REC-${year}-` } });
  return `REC-${year}-${String(count + 1).padStart(4, "0")}`;
}

function deriveInvoiceStatus(invoice, newPaidAmount) {
  if (newPaidAmount >= invoice.amount) return "paid";
  if (newPaidAmount > 0) return "partial";
  return "unpaid";
}

async function recordPayment(req, res) {
  const body = req.body;
  if (!body.invoiceId) badRequest("invoiceId is required.", "invoiceId");
  if (body.amount == null) badRequest("amount is required.", "amount");
  if (!body.paymentMethod) badRequest("paymentMethod is required.", "paymentMethod");
  const invoiceId = Number(body.invoiceId);
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) badRequest("amount must be a positive number.", "amount");
  const invoice = await SalesInvoices.findOne({ id: invoiceId }).lean();
  if (!invoice) notFound("Invoice");
  if (invoice.status === "paid") badRequest("This invoice is already fully paid.", "invoiceId");
  const newPaidAmount = Math.min(invoice.amount, invoice.paidAmount + amount);
  const newStatus = deriveInvoiceStatus(invoice, newPaidAmount);
  const [receiptNumber, id] = await Promise.all([
    nextReceiptNumber(),
    getNextSequence("sales_payments"),
  ]);
  await Promise.all([
    SalesPayments.create({
      id,
      invoiceId,
      customerId: invoice.customerId,
      amount,
      paymentMethod: body.paymentMethod,
      transactionId: optionalString(body.transactionId) ?? null,
      recordedBy: req.user.id,
      receiptNumber,
    }),
    SalesInvoices.updateOne({ id: invoiceId }, { $set: { paidAmount: newPaidAmount, status: newStatus } }),
  ]);
  const payment = await SalesPayments.findOne({ id }).lean();
  res.status(201).json({ ...payment, invoiceStatus: newStatus });
}

async function getReceiptById(req, res) {
  const id = parseIdParam(req.params.id, "payment id");
  const payment = await SalesPayments.findOne({ id }).lean();
  if (!payment) notFound("Receipt");
  const [invoice, customer] = await Promise.all([
    SalesInvoices.findOne({ id: payment.invoiceId }).lean(),
    SalesCustomers.findOne({ id: payment.customerId }).lean(),
  ]);
  res.json({ payment, invoice, customer });
}

export { listPayments, recordPayment, getReceiptById };
