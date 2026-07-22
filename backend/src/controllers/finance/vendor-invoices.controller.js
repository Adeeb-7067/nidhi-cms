import {
  FinanceVendorInvoices,
  vendorsTable,
  companySettingsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, optionalString } from "../../utils/route-errors.js";
import { calcVendorInvoiceAmounts } from "../../utils/vendor-invoice-totals.js";
import { vendorInvoiceStatuses } from "../../models/schema/finance/vendor-invoices.js";

function startOfDayDate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function assertAfterLockDate(dateToCheck) {
  if (!dateToCheck) return;
  const settings = await companySettingsTable.findOne().select({ fiscalLockDate: 1 }).lean();
  if (settings?.fiscalLockDate) {
    const checkTime = startOfDayDate(dateToCheck).getTime();
    const lockTime = startOfDayDate(settings.fiscalLockDate).getTime();
    if (checkTime <= lockTime) {
      badRequest("Transaction date cannot be on or before the closed fiscal lock date.", "invoiceDate");
    }
  }
}

async function assertVendorId(vendorId) {
  const id = Number(vendorId);
  if (!Number.isFinite(id)) badRequest("vendorId must be a valid number.", "vendorId");
  const vendor = await vendorsTable.findOne({ id }).select({ id: 1, companyName: 1 }).lean();
  if (!vendor) notFound("Vendor");
  return vendor;
}

function toDto(row, vendorName = null) {
  return {
    id: row.id,
    vendorId: row.vendorId,
    vendorName: vendorName ?? row.vendorName ?? null,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    taxableAmount: row.taxableAmount,
    gstEnabled: row.gstEnabled,
    gstRate: row.gstRate,
    gstAmount: row.gstAmount,
    totalAmount: row.totalAmount,
    status: row.status,
    notes: row.notes ?? null,
    attachments: row.attachments ?? [],
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function enrichInvoices(items) {
  const vendorIds = [...new Set(items.map((i) => i.vendorId).filter(Boolean))];
  const vendors = vendorIds.length
    ? await vendorsTable.find({ id: { $in: vendorIds } }).select({ id: 1, companyName: 1 }).lean()
    : [];
  const vendorMap = new Map(vendors.map((v) => [v.id, v.companyName]));
  return items.map((row) => toDto(row, vendorMap.get(row.vendorId) ?? null));
}

async function listVendorInvoices(req, res) {
  const vendorId = parseIdParam(req.params.vendorId, "vendor id");
  await assertVendorId(vendorId);

  const rows = await FinanceVendorInvoices.find({ vendorId })
    .sort({ invoiceDate: -1, id: -1 })
    .lean();
  const invoices = await enrichInvoices(rows);

  const summary = invoices.reduce(
    (acc, inv) => {
      if (inv.status === "cancelled") return acc;
      acc.invoiceCount += 1;
      acc.totalBilled += inv.totalAmount;
      acc.inputGst += inv.gstEnabled ? inv.gstAmount : 0;
      if (inv.status === "unpaid") acc.unpaidTotal += inv.totalAmount;
      return acc;
    },
    { invoiceCount: 0, totalBilled: 0, inputGst: 0, unpaidTotal: 0 },
  );

  res.json({ invoices, summary });
}

async function getVendorInvoiceById(req, res) {
  const id = parseIdParam(req.params.id, "vendor invoice id");
  const row = await FinanceVendorInvoices.findOne({ id }).lean();
  if (!row) notFound("Vendor invoice");
  const [invoice] = await enrichInvoices([row]);
  res.json(invoice);
}

async function createVendorInvoice(req, res) {
  const vendorId = parseIdParam(req.params.vendorId, "vendor id");
  await assertVendorId(vendorId);
  const body = req.body ?? {};

  if (!body.invoiceNumber?.trim()) badRequest("invoiceNumber is required.", "invoiceNumber");
  if (!body.invoiceDate) badRequest("invoiceDate is required.", "invoiceDate");
  await assertAfterLockDate(body.invoiceDate);

  const taxableAmount = Number(body.taxableAmount);
  if (!(taxableAmount > 0)) badRequest("taxableAmount must be a positive number.", "taxableAmount");

  const gstEnabled = body.gstEnabled !== false;
  const amounts = calcVendorInvoiceAmounts(taxableAmount, body.gstRate ?? 18, gstEnabled);
  if (!(amounts.totalAmount > 0)) badRequest("Invoice total must be greater than zero.", "taxableAmount");

  const status = body.status && vendorInvoiceStatuses.includes(body.status) ? body.status : "unpaid";

  const id = await getNextSequence("finance_vendor_invoices");
  const invoice = await FinanceVendorInvoices.create({
    id,
    vendorId,
    invoiceNumber: body.invoiceNumber.trim(),
    invoiceDate: new Date(body.invoiceDate),
    ...amounts,
    status,
    notes: optionalString(body.notes) ?? null,
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    createdBy: req.user.id,
  });

  const [enriched] = await enrichInvoices([invoice.toObject()]);
  res.status(201).json(enriched);
}

async function updateVendorInvoice(req, res) {
  const id = parseIdParam(req.params.id, "vendor invoice id");
  const existing = await FinanceVendorInvoices.findOne({ id }).lean();
  if (!existing) notFound("Vendor invoice");
  if (existing.status === "cancelled") {
    badRequest("Cancelled vendor invoices cannot be edited.", "status");
  }

  const body = req.body ?? {};
  await assertAfterLockDate(existing.invoiceDate);
  if (body.invoiceDate !== undefined) await assertAfterLockDate(body.invoiceDate);

  const updates = {};
  if (body.invoiceNumber !== undefined) {
    const num = optionalString(body.invoiceNumber);
    if (!num) badRequest("invoiceNumber cannot be empty.", "invoiceNumber");
    updates.invoiceNumber = num;
  }
  if (body.invoiceDate !== undefined) updates.invoiceDate = new Date(body.invoiceDate);
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;
  if (body.attachments !== undefined) updates.attachments = body.attachments;
  if (body.status !== undefined) {
    if (!vendorInvoiceStatuses.includes(body.status)) {
      badRequest(`status must be one of: ${vendorInvoiceStatuses.join(", ")}.`, "status");
    }
    updates.status = body.status;
  }

  const taxableAmount =
    body.taxableAmount !== undefined ? Number(body.taxableAmount) : existing.taxableAmount;
  const gstEnabled = body.gstEnabled !== undefined ? Boolean(body.gstEnabled) : existing.gstEnabled;
  const gstRate = body.gstRate !== undefined ? body.gstRate : existing.gstRate;

  if (body.taxableAmount !== undefined || body.gstEnabled !== undefined || body.gstRate !== undefined) {
    if (!(taxableAmount > 0)) badRequest("taxableAmount must be a positive number.", "taxableAmount");
    Object.assign(updates, calcVendorInvoiceAmounts(taxableAmount, gstRate, gstEnabled));
  }

  const updated = await FinanceVendorInvoices.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  const [enriched] = await enrichInvoices([updated]);
  res.json(enriched);
}

async function deleteVendorInvoice(req, res) {
  const id = parseIdParam(req.params.id, "vendor invoice id");
  const existing = await FinanceVendorInvoices.findOne({ id }).select({ id: 1 }).lean();
  if (!existing) notFound("Vendor invoice");
  await FinanceVendorInvoices.deleteOne({ id });
  res.json({ success: true });
}

export {
  listVendorInvoices,
  getVendorInvoiceById,
  createVendorInvoice,
  updateVendorInvoice,
  deleteVendorInvoice,
};
