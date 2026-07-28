import {
  FinanceVendorInvoices,
  vendorsTable,
  companySettingsTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, optionalString } from "../../../utils/route-errors.js";
import { calcVendorInvoiceAmounts } from "../../../utils/vendor-invoice-totals.js";
import { vendorInvoiceStatuses } from "../schema/vendor-invoices.js";
import { runInTx } from "../../../lib/db-tx.js";
import { settleVendorInvoice } from "../services/cash-bridges.service.js";

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
    paidAmount: row.paidAmount ?? 0,
    paymentId: row.paymentId ?? null,
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
  const rows = await FinanceVendorInvoices.find({ vendorId }).sort({ invoiceDate: -1 }).lean();
  const invoices = await enrichInvoices(rows);
  const summary = invoices.reduce(
    (acc, inv) => {
      if (inv.status === "cancelled") return acc;
      acc.count += 1;
      acc.totalAmount += inv.totalAmount;
      acc.gstAmount += inv.gstAmount ?? 0;
      const outstanding = Math.max(0, inv.totalAmount - (inv.paidAmount ?? 0));
      if (outstanding > 0) acc.unpaidTotal += outstanding;
      return acc;
    },
    { count: 0, totalAmount: 0, gstAmount: 0, unpaidTotal: 0 },
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

  const wantPaid = body.status === "paid";
  if (body.status && !vendorInvoiceStatuses.includes(body.status)) {
    badRequest(`status must be one of: ${vendorInvoiceStatuses.join(", ")}.`, "status");
  }

  let enriched;
  await runInTx(async (session) => {
    const id = await getNextSequence("finance_vendor_invoices");
    const [invoice] = await FinanceVendorInvoices.create(
      [
        {
          id,
          vendorId,
          invoiceNumber: body.invoiceNumber.trim(),
          invoiceDate: new Date(body.invoiceDate),
          ...amounts,
          status: "unpaid",
          paidAmount: 0,
          notes: optionalString(body.notes) ?? null,
          attachments: Array.isArray(body.attachments) ? body.attachments : [],
          createdBy: req.user.id,
        },
      ],
      { session },
    );

    if (wantPaid) {
      await settleVendorInvoice(session, {
        invoice: invoice.toObject ? invoice.toObject() : invoice,
        mode: body.paymentMode || "bank_transfer",
        reference: body.paymentReference ?? null,
        recordedBy: req.user.id,
        date: body.paymentDate ?? body.invoiceDate,
      });
    }

    const fresh = await FinanceVendorInvoices.findOne({ id }).session(session).lean();
    [enriched] = await enrichInvoices([fresh]);
  });

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

  if (body.status === "paid" && existing.status !== "paid") {
    // Paying goes through settle — do not only flip the flag.
    let enriched;
    await runInTx(async (session) => {
      const updates = {};
      if (body.invoiceNumber !== undefined) {
        const num = optionalString(body.invoiceNumber);
        if (!num) badRequest("invoiceNumber cannot be empty.", "invoiceNumber");
        updates.invoiceNumber = num;
      }
      if (body.invoiceDate !== undefined) updates.invoiceDate = new Date(body.invoiceDate);
      if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;
      if (body.attachments !== undefined) updates.attachments = body.attachments;
      if (Object.keys(updates).length) {
        await FinanceVendorInvoices.updateOne({ id }, { $set: updates }, { session });
      }
      const invoice = await FinanceVendorInvoices.findOne({ id }).session(session).lean();
      await settleVendorInvoice(session, {
        invoice,
        mode: body.paymentMode || "bank_transfer",
        reference: body.paymentReference ?? null,
        recordedBy: req.user.id,
        date: body.paymentDate ?? null,
      });
      const fresh = await FinanceVendorInvoices.findOne({ id }).session(session).lean();
      [enriched] = await enrichInvoices([fresh]);
    });
    return res.json(enriched);
  }

  if (body.status === "unpaid" && existing.status === "paid") {
    badRequest(
      "Paid vendor invoices cannot be marked unpaid here. Delete the linked payment from Finance → Payments if needed.",
      "status",
    );
  }

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
    if (body.status === "paid") {
      // handled above
    } else {
      updates.status = body.status;
    }
  }

  const taxableAmount =
    body.taxableAmount !== undefined ? Number(body.taxableAmount) : existing.taxableAmount;
  const gstEnabled = body.gstEnabled !== undefined ? Boolean(body.gstEnabled) : existing.gstEnabled;
  const gstRate = body.gstRate !== undefined ? body.gstRate : existing.gstRate;

  if (body.taxableAmount !== undefined || body.gstEnabled !== undefined || body.gstRate !== undefined) {
    if ((existing.paidAmount ?? 0) > 0) {
      badRequest("Amounts cannot change after cash has been recorded against this bill.", "taxableAmount");
    }
    if (!(taxableAmount > 0)) badRequest("taxableAmount must be a positive number.", "taxableAmount");
    Object.assign(updates, calcVendorInvoiceAmounts(taxableAmount, gstRate, gstEnabled));
  }

  const updated = await FinanceVendorInvoices.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  const [enriched] = await enrichInvoices([updated]);
  res.json(enriched);
}

/** Explicit pay endpoint — preferred over status=paid on the form. */
async function payVendorInvoice(req, res) {
  const id = parseIdParam(req.params.id, "vendor invoice id");
  const invoice = await FinanceVendorInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Vendor invoice");
  const body = req.body ?? {};

  let enriched;
  await runInTx(async (session) => {
    await settleVendorInvoice(session, {
      invoice,
      mode: body.paymentMode || body.mode || "bank_transfer",
      reference: body.reference ?? body.paymentReference ?? null,
      recordedBy: req.user.id,
      date: body.date ?? body.paymentDate ?? null,
      amount: body.amount != null ? Number(body.amount) : null,
    });
    const fresh = await FinanceVendorInvoices.findOne({ id }).session(session).lean();
    [enriched] = await enrichInvoices([fresh]);
  });

  res.status(201).json(enriched);
}

async function deleteVendorInvoice(req, res) {
  const id = parseIdParam(req.params.id, "vendor invoice id");
  const existing = await FinanceVendorInvoices.findOne({ id }).lean();
  if (!existing) notFound("Vendor invoice");
  if ((existing.paidAmount ?? 0) > 0 || existing.status === "paid") {
    badRequest("Paid vendor invoices cannot be deleted. Reverse the payment first.", "status");
  }
  await FinanceVendorInvoices.deleteOne({ id });
  res.json({ success: true });
}

export {
  listVendorInvoices,
  getVendorInvoiceById,
  createVendorInvoice,
  updateVendorInvoice,
  payVendorInvoice,
  deleteVendorInvoice,
};
