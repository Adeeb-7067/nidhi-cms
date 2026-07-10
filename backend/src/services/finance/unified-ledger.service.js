import {
  FinancePayments,
  FinanceInvoices,
  SalesPayments,
  SalesInvoices,
  clientsTable,
  usersTable,
  Projects,
} from "../../models/schema/index.js";
import { calcInvoiceTotal } from "../../utils/finance-totals.js";
import { calcSalesInvoiceBreakdown, resolvePaymentGstFields } from "../../utils/sales-totals.js";
import { notFound } from "../../utils/route-errors.js";

const SALES_INVOICE_STATUS_MAP = {
  partial: "partially_paid",
  unpaid: "unpaid",
  paid: "paid",
  overdue: "overdue",
  cancelled: "cancelled",
};

function normalizeSalesInvoiceStatus(status) {
  return SALES_INVOICE_STATUS_MAP[status] ?? status;
}

function financeInvoiceOutstanding(inv) {
  const { total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
  return Math.max(0, total - (inv.paidAmount ?? 0));
}

function salesInvoiceOutstanding(inv) {
  return Math.max(0, (inv.amount ?? 0) - (inv.paidAmount ?? 0));
}

function salesInvoiceTotal(inv) {
  return inv.adjustedTotal ?? inv.calculatedAmount ?? inv.amount ?? 0;
}

function matchesSearch(text, q) {
  return text?.toLowerCase().includes(q.toLowerCase());
}

function normalizeFinancePayment(row, recorderName = null, gst = null) {
  return {
    ...row,
    source: "finance",
    date: row.date ?? row.createdAt,
    salesPaymentId: row.salesPaymentId ?? null,
    salesInvoiceId: row.salesInvoiceId ?? null,
    salesReceiptHref: row.salesPaymentId ? `/sales/receipts/${row.salesPaymentId}` : null,
    recordedByName: recorderName,
    gstEnabled: gst?.gstEnabled ?? row.gstEnabled ?? null,
    gstAmount: gst?.gstAmount ?? row.gstAmount ?? 0,
    taxableAmount: gst?.taxableAmount ?? row.amount - (row.gstAmount ?? 0),
  };
}

function normalizeSalesPayment(row, clientName, recorderName = null, gst = null) {
  return {
    id: row.id,
    source: "sales",
    date: row.paymentDate ?? row.createdAt,
    amount: row.amount,
    mode: row.paymentMethod,
    direction: "incoming",
    reference: row.receiptNumber,
    receiptNumber: row.receiptNumber,
    status: "completed",
    partyType: "client",
    partyName: clientName ?? "Client",
    clientId: row.customerId,
    vendorId: null,
    employeeId: null,
    invoiceId: row.invoiceId ?? null,
    salesInvoiceId: row.invoiceId ?? null,
    expenseId: null,
    bankAccountId: null,
    salesPaymentId: row.id,
    salesReceiptHref: `/sales/receipts/${row.id}`,
    recordedBy: row.recordedBy,
    recordedByName: recorderName,
    gstEnabled: gst?.gstEnabled ?? null,
    gstAmount: gst?.gstAmount ?? 0,
    taxableAmount: gst?.taxableAmount ?? row.amount,
    createdAt: row.createdAt,
  };
}

function normalizeFinanceInvoice(row, clientName, projectName) {
  const totals = calcInvoiceTotal(row.items, row.discount, row.gstEnabled);
  return {
    ...row,
    source: "finance",
    clientName,
    projectName,
    ...totals,
    detailHref: `/finance/invoices/${row.id}`,
  };
}

function normalizeSalesInvoice(row, clientName, projectName) {
  const breakdown = calcSalesInvoiceBreakdown(row);
  return {
    id: row.id,
    source: "sales",
    number: row.number,
    clientId: row.customerId,
    projectId: row.projectId ?? null,
    issueDate: row.issueDate ?? row.createdAt,
    dueDate: row.dueDate,
    status: normalizeSalesInvoiceStatus(row.status),
    paidAmount: row.paidAmount ?? 0,
    items: (row.lineItems ?? []).map((item) => ({
      id: item.itemId,
      description: item.name || item.description || "",
      quantity: item.quantity,
      rate: item.unitPrice,
      taxPercent: item.taxPercent ?? 0,
    })),
    discount: 0,
    gstEnabled: breakdown.gstEnabled,
    notes: row.notes ?? null,
    creditNotes: [],
    subtotal: breakdown.subtotal,
    tax: breakdown.tax,
    total: breakdown.total,
    clientName,
    projectName,
    detailHref: `/sales/invoices/${row.id}`,
    createdAt: row.createdAt,
  };
}

async function loadRecorderMap(ids) {
  const recorderIds = [...new Set(ids.filter(Boolean))];
  if (!recorderIds.length) return new Map();
  const rows = await usersTable.find({ id: { $in: recorderIds } }).select({ id: 1, name: 1 }).lean();
  return new Map(rows.map((u) => [u.id, u.name]));
}

async function loadClientMap(ids) {
  const clientIds = [...new Set(ids.filter(Boolean))];
  if (!clientIds.length) return new Map();
  const rows = await clientsTable.find({ id: { $in: clientIds } }).select({ id: 1, companyName: 1 }).lean();
  return new Map(rows.map((c) => [c.id, c.companyName]));
}

async function loadProjectMap(ids) {
  const projectIds = [...new Set(ids.filter(Boolean))];
  if (!projectIds.length) return new Map();
  const rows = await Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1 }).lean();
  return new Map(rows.map((p) => [p.id, p.name]));
}

async function loadSalesInvoiceMap(ids) {
  const invoiceIds = [...new Set(ids.filter(Boolean))];
  if (!invoiceIds.length) return new Map();
  const rows = await SalesInvoices.find({ id: { $in: invoiceIds } }).lean();
  return new Map(rows.map((inv) => [inv.id, inv]));
}

async function loadSalesPaymentMap(ids) {
  const paymentIds = [...new Set(ids.filter(Boolean))];
  if (!paymentIds.length) return new Map();
  const rows = await SalesPayments.find({ id: { $in: paymentIds } }).select({ id: 1, invoiceId: 1 }).lean();
  return new Map(rows.map((p) => [p.id, p]));
}

function collectPaymentInvoiceIds(financeRows, salesRows, salesPaymentMap) {
  const ids = new Set();
  for (const row of salesRows) {
    if (row.invoiceId) ids.add(row.invoiceId);
  }
  for (const row of financeRows) {
    if (row.salesInvoiceId) ids.add(row.salesInvoiceId);
    else if (row.salesPaymentId) {
      const sp = salesPaymentMap.get(row.salesPaymentId);
      if (sp?.invoiceId) ids.add(sp.invoiceId);
    }
  }
  return [...ids];
}

function resolvePaymentGst(row, source, invoiceMap, salesPaymentMap) {
  let invoice = null;
  if (row.salesInvoiceId) invoice = invoiceMap.get(row.salesInvoiceId) ?? null;
  else if (source === "sales" && row.invoiceId) invoice = invoiceMap.get(row.invoiceId) ?? null;
  else if (row.salesPaymentId) {
    const sp = salesPaymentMap.get(row.salesPaymentId);
    if (sp?.invoiceId) invoice = invoiceMap.get(sp.invoiceId) ?? null;
  }
  return resolvePaymentGstFields({
    paymentAmount: row.amount,
    invoice,
    storedGstEnabled: row.gstEnabled,
    storedGstAmount: row.gstAmount,
  });
}

function paginateMerged(rows, page, limit) {
  const skip = (page - 1) * limit;
  return {
    items: rows.slice(skip, skip + limit),
    total: rows.length,
    page,
    limit,
  };
}

function sortByDateDesc(a, b) {
  return new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt);
}

export async function listUnifiedPayments({ direction, search, page = 1, limit = 20 }) {
  const q = search?.trim() ?? "";

  if (direction === "outgoing") {
    const filter = { direction: "outgoing" };
    if (q) {
      const re = { $regex: q, $options: "i" };
      filter.$or = [{ partyName: re }, { reference: re }, { receiptNumber: re }];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      FinancePayments.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FinancePayments.countDocuments(filter),
    ]);
    const recorderMap = await loadRecorderMap(items.map((p) => p.recordedBy));
    return {
      payments: items.map((p) => normalizeFinancePayment(p, recorderMap.get(p.recordedBy) ?? null)),
      total,
      page,
      limit,
    };
  }

  const financeFilter = { direction: { $ne: "outgoing" } };
  if (direction === "incoming") {
    financeFilter.direction = "incoming";
  }

  const [financeRows, mirroredSalesIds] = await Promise.all([
    FinancePayments.find(financeFilter).sort({ createdAt: -1 }).lean(),
    FinancePayments.distinct("salesPaymentId", { salesPaymentId: { $ne: null } }),
  ]);

  const salesRows = await SalesPayments.find({
    id: { $nin: mirroredSalesIds.length ? mirroredSalesIds : [-1] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const clientMap = await loadClientMap([
    ...financeRows.map((p) => p.clientId),
    ...salesRows.map((p) => p.customerId),
  ]);
  const recorderMap = await loadRecorderMap([
    ...financeRows.map((p) => p.recordedBy),
    ...salesRows.map((p) => p.recordedBy),
  ]);
  const salesPaymentMap = await loadSalesPaymentMap(financeRows.map((p) => p.salesPaymentId));
  const invoiceMap = await loadSalesInvoiceMap(collectPaymentInvoiceIds(financeRows, salesRows, salesPaymentMap));

  let merged = [
    ...financeRows.map((p) =>
      normalizeFinancePayment(
        p,
        recorderMap.get(p.recordedBy) ?? null,
        resolvePaymentGst(p, "finance", invoiceMap, salesPaymentMap),
      ),
    ),
    ...salesRows.map((p) =>
      normalizeSalesPayment(
        p,
        clientMap.get(p.customerId) ?? null,
        recorderMap.get(p.recordedBy) ?? null,
        resolvePaymentGst(p, "sales", invoiceMap, salesPaymentMap),
      ),
    ),
  ];

  if (q) {
    merged = merged.filter(
      (p) =>
        matchesSearch(p.partyName, q) ||
        matchesSearch(p.reference, q) ||
        matchesSearch(p.receiptNumber, q),
    );
  }

  merged.sort(sortByDateDesc);
  const { items, total } = paginateMerged(merged, page, limit);
  return { payments: items, total, page, limit };
}

export async function getUnifiedPayment(source, id) {
  if (source === "sales") {
    const payment = await SalesPayments.findOne({ id }).lean();
    if (!payment) notFound("Payment");
    const [client, recorderMap, invoiceMap] = await Promise.all([
      clientsTable.findOne({ id: payment.customerId }).select({ companyName: 1 }).lean(),
      loadRecorderMap([payment.recordedBy]),
      payment.invoiceId ? loadSalesInvoiceMap([payment.invoiceId]) : Promise.resolve(new Map()),
    ]);
    const gst = resolvePaymentGst(payment, "sales", invoiceMap, new Map());
    return normalizeSalesPayment(
      payment,
      client?.companyName ?? null,
      recorderMap.get(payment.recordedBy) ?? null,
      gst,
    );
  }

  const payment = await FinancePayments.findOne({ id }).lean();
  if (!payment) notFound("Payment");
  const [recorderMap, salesPaymentMap] = await Promise.all([
    loadRecorderMap([payment.recordedBy]),
    payment.salesPaymentId ? loadSalesPaymentMap([payment.salesPaymentId]) : Promise.resolve(new Map()),
  ]);
  const invoiceMap = await loadSalesInvoiceMap(collectPaymentInvoiceIds([payment], [], salesPaymentMap));
  const gst = resolvePaymentGst(payment, "finance", invoiceMap, salesPaymentMap);
  return normalizeFinancePayment(payment, recorderMap.get(payment.recordedBy) ?? null, gst);
}

export async function computePaymentsSummary() {
  const { payments } = await listUnifiedPayments({ page: 1, limit: 100_000 });
  const completed = payments.filter((p) => p.status === "completed");
  const incomingRows = completed.filter((p) => p.direction === "incoming");
  const outgoingRows = completed.filter((p) => p.direction === "outgoing");
  const incoming = incomingRows.reduce((s, p) => s + p.amount, 0);
  const outgoing = outgoingRows.reduce((s, p) => s + p.amount, 0);
  const gstIncoming = incomingRows
    .filter((p) => p.gstEnabled !== false)
    .reduce((s, p) => s + p.amount, 0);
  const nonGstIncoming = incomingRows
    .filter((p) => p.gstEnabled === false)
    .reduce((s, p) => s + p.amount, 0);
  const gstTaxCollected = incomingRows.reduce((s, p) => s + (p.gstAmount ?? 0), 0);
  return { incoming, outgoing, net: incoming - outgoing, gstIncoming, nonGstIncoming, gstTaxCollected };
}

export async function listUnifiedInvoices({ status, clientId, search, page = 1, limit = 20 }) {
  const [financeRows, salesRows] = await Promise.all([
    FinanceInvoices.find({}).sort({ createdAt: -1 }).lean(),
    SalesInvoices.find({ status: { $ne: "cancelled" } }).sort({ createdAt: -1 }).lean(),
  ]);

  const clientMap = await loadClientMap([
    ...financeRows.map((i) => i.clientId),
    ...salesRows.map((i) => i.customerId),
  ]);
  const projectMap = await loadProjectMap([
    ...financeRows.map((i) => i.projectId),
    ...salesRows.map((i) => i.projectId),
  ]);

  let merged = [
    ...financeRows.map((i) =>
      normalizeFinanceInvoice(i, clientMap.get(i.clientId) ?? null, i.projectId ? projectMap.get(i.projectId) ?? null : null),
    ),
    ...salesRows.map((i) =>
      normalizeSalesInvoice(
        i,
        clientMap.get(i.customerId) ?? null,
        i.projectId ? projectMap.get(i.projectId) ?? null : null,
      ),
    ),
  ];

  if (status) {
    merged = merged.filter((i) => i.status === status);
  }
  if (clientId) {
    merged = merged.filter((i) => i.clientId === Number(clientId));
  }
  const q = search?.trim();
  if (q) {
    merged = merged.filter(
      (i) => matchesSearch(i.number, q) || matchesSearch(i.clientName, q),
    );
  }

  merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const { items, total } = paginateMerged(merged, page, limit);
  return { invoices: items, total, page, limit };
}

export async function computeInvoicesSummary() {
  const { invoices } = await listUnifiedInvoices({ page: 1, limit: 100_000 });
  const counts = { all: invoices.length, overdue: 0, unpaid: 0, partially_paid: 0, paid: 0 };
  let outstanding = 0;
  let gstCount = 0;
  let nonGstCount = 0;
  let gstTaxTotal = 0;
  for (const inv of invoices) {
    if (inv.gstEnabled) {
      gstCount += 1;
      gstTaxTotal += inv.tax ?? 0;
    } else {
      nonGstCount += 1;
    }
    if (inv.status === "overdue") counts.overdue += 1;
    if (inv.status === "unpaid") counts.unpaid += 1;
    if (inv.status === "partially_paid") counts.partially_paid += 1;
    if (inv.status === "paid") counts.paid += 1;
    if (inv.status === "unpaid" || inv.status === "partially_paid" || inv.status === "overdue") {
      outstanding += Math.max(0, (inv.total ?? 0) - inv.paidAmount);
    }
  }
  return { counts, outstanding, gstCount, nonGstCount, gstTaxTotal };
}

export async function computeUnifiedOutstanding() {
  const [financeOpen, salesOpen] = await Promise.all([
    FinanceInvoices.find({ status: { $in: ["unpaid", "partially_paid", "overdue"] } }).lean(),
    SalesInvoices.find({ status: { $in: ["unpaid", "partial", "overdue"] } }).lean(),
  ]);

  let pendingCount = 0;
  let overdueAmount = 0;
  const now = new Date();

  for (const inv of financeOpen) {
    const out = financeInvoiceOutstanding(inv);
    if (out <= 0) continue;
    pendingCount += 1;
    if (inv.status === "overdue" || new Date(inv.dueDate) < now) {
      overdueAmount += out;
    }
  }

  for (const inv of salesOpen) {
    const out = salesInvoiceOutstanding(inv);
    if (out <= 0) continue;
    pendingCount += 1;
    if (inv.status === "overdue" || new Date(inv.dueDate) < now) {
      overdueAmount += out;
    }
  }

  return { pendingCount, overdueAmount };
}

export async function computeUnifiedInvoiceAging() {
  const { invoices } = await listUnifiedInvoices({ page: 1, limit: 100_000 });
  const now = new Date();
  const buckets = [
    { bucket: "Current", count: 0, amount: 0 },
    { bucket: "1–30 days", count: 0, amount: 0 },
    { bucket: "31–60 days", count: 0, amount: 0 },
    { bucket: "61–90 days", count: 0, amount: 0 },
    { bucket: "90+ days", count: 0, amount: 0 },
  ];
  for (const inv of invoices) {
    if (!["unpaid", "partially_paid", "overdue"].includes(inv.status)) continue;
    const outstanding = Math.max(0, (inv.total ?? 0) - inv.paidAmount);
    if (outstanding <= 0) continue;
    const daysPastDue = Math.floor((now - new Date(inv.dueDate)) / (24 * 60 * 60 * 1000));
    const idx = daysPastDue <= 0 ? 0 : daysPastDue <= 30 ? 1 : daysPastDue <= 60 ? 2 : daysPastDue <= 90 ? 3 : 4;
    buckets[idx].count += 1;
    buckets[idx].amount += outstanding;
  }
  return buckets;
}
