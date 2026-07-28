import {
  FinanceInvoices,
  FinanceExpenses,
  FinanceIncome,
  FinanceVendorInvoices,
  FinancePayments,
  PayrollRuns,
  PayrollLines,
  FinanceTaxDeposits,
  SalesInvoices,
} from "../../../models/schema/index.js";
import { calcInvoiceTotal } from "../../../utils/finance-totals.js";
import { calcSalesInvoiceBreakdown } from "../../../utils/sales-totals.js";
import { recognizedExpenseGstExpr } from "./expense-cash.service.js";

/**
 * GST input credit share of a vendor-bill settlement (cash basis).
 * `paymentAmount` is the cash paid against `invoice.totalAmount`.
 */
export function recognizedVendorInvoiceGstShare(invoice, paymentAmount) {
  if (!invoice?.gstEnabled || invoice.status === "cancelled") return 0;
  const total = Number(invoice.totalAmount) || 0;
  const gst = Number(invoice.gstAmount) || 0;
  const pay = Math.max(0, Number(paymentAmount) || 0);
  if (!(total > 0) || !(gst > 0) || !(pay > 0)) return 0;
  return Math.round((gst * Math.min(pay, total)) / total);
}

/** Full bill GST for legacy status=paid rows that never got a cash payment bridge. */
export function legacyVendorInvoiceGst(invoice) {
  if (!invoice?.gstEnabled || invoice.status !== "paid") return 0;
  if (invoice.paymentId != null) return 0;
  const paid = Number(invoice.paidAmount);
  if (Number.isFinite(paid) && paid > 0) return 0;
  return Math.max(0, Number(invoice.gstAmount) || 0);
}

function monthRange(year, month) {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

function quarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  return { start: new Date(year, startMonth, 1), end: new Date(year, startMonth + 3, 1) };
}

/** Indian FY: April 1 (year) – March 31 (year+1). */
function fiscalYearRange(fyStartYear) {
  return { start: new Date(fyStartYear, 3, 1), end: new Date(fyStartYear + 1, 3, 1) };
}

/**
 * Output GST on a finance invoice (line tax). Credit notes reduce GST in proportion
 * to the invoice total (CN amount is gross; we allocate tax share).
 */
export function financeInvoiceOutputGst(inv) {
  if (!inv || inv.status === "cancelled" || inv.gstEnabled === false) return 0;
  const { tax, total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
  if (!(tax > 0)) return 0;
  const credits = (inv.creditNotes ?? []).reduce((s, cn) => s + (Number(cn.amount) || 0), 0);
  if (!(credits > 0) || !(total > 0)) return tax;
  const creditTax = Math.round((tax * Math.min(credits, total)) / total);
  return Math.max(0, tax - creditTax);
}

/**
 * Tax portion of a credit note dated in-period (same ratio as invoice tax/total).
 * Used so CNs issued in a later month reduce that month's GST collected.
 */
export function creditNoteOutputGst(inv, creditNote) {
  if (!inv || inv.status === "cancelled" || inv.gstEnabled === false) return 0;
  const { tax, total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
  const cnAmount = Number(creditNote?.amount) || 0;
  if (!(tax > 0) || !(total > 0) || !(cnAmount > 0)) return 0;
  return Math.round((tax * Math.min(cnAmount, total)) / total);
}

export function salesInvoiceOutputGst(inv) {
  if (!inv || inv.status === "cancelled") return 0;
  return calcSalesInvoiceBreakdown(inv).tax ?? 0;
}

/**
 * OUTPUT GST (liability before ITC):
 * - Finance invoices by issueDate (accrual), net of same-month credit notes
 * - Credit notes dated in range on invoices issued earlier (reduce this period)
 * - Sales invoices by issueDate (accrual)
 * - Manual income with gstAmount ONLY when not linked to any invoice / sales receipt
 *   (avoids double-counting invoice GST + receipt GST)
 */
async function gstCollectedInRange(start, end) {
  const [financeInvoices, salesInvoices, manualIncome, cnParentInvoices] = await Promise.all([
    FinanceInvoices.find({
      issueDate: { $gte: start, $lt: end },
      status: { $ne: "cancelled" },
    }).lean(),
    SalesInvoices.find({
      issueDate: { $gte: start, $lt: end },
      status: { $ne: "cancelled" },
    }).lean(),
    FinanceIncome.find({
      date: { $gte: start, $lt: end },
      status: "received",
      gstAmount: { $gt: 0 },
      // Not a sales mirror and not settlement of an invoice (those GST live on the invoice).
      salesPaymentId: null,
      salesInvoiceId: null,
      $or: [{ invoiceId: null }, { invoiceId: { $exists: false } }],
    }).lean(),
    // Parents of credit notes dated in this period (may have been issued earlier).
    FinanceInvoices.find({
      status: { $ne: "cancelled" },
      "creditNotes.date": { $gte: start, $lt: end },
      // Exclude invoices already counted above (issue in range) — handled via net tax there.
      issueDate: { $lt: start },
    }).lean(),
  ]);

  let fromFinanceInvoices = 0;
  for (const inv of financeInvoices) {
    const { tax, total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
    if (!(tax > 0)) continue;
    // Only subtract credit notes dated inside this same period (others hit their own month).
    const creditsInPeriod = (inv.creditNotes ?? [])
      .filter((cn) => {
        const d = cn.date ? new Date(cn.date) : null;
        return d && d >= start && d < end;
      })
      .reduce((s, cn) => s + (Number(cn.amount) || 0), 0);
    if (!(creditsInPeriod > 0) || !(total > 0)) {
      fromFinanceInvoices += tax;
    } else {
      fromFinanceInvoices += Math.max(0, tax - Math.round((tax * Math.min(creditsInPeriod, total)) / total));
    }
  }

  let fromPriorInvoiceCreditNotes = 0;
  for (const inv of cnParentInvoices) {
    for (const cn of inv.creditNotes ?? []) {
      const d = cn.date ? new Date(cn.date) : null;
      if (!d || d < start || d >= end) continue;
      fromPriorInvoiceCreditNotes += creditNoteOutputGst(inv, cn);
    }
  }

  const fromSalesInvoices = salesInvoices.reduce((sum, inv) => sum + salesInvoiceOutputGst(inv), 0);
  const fromManualIncome = manualIncome.reduce((sum, row) => sum + (Number(row.gstAmount) || 0), 0);

  return (
    fromFinanceInvoices +
    fromSalesInvoices +
    fromManualIncome -
    fromPriorInvoiceCreditNotes
  );
}

/**
 * INPUT GST (ITC):
 * - Vendor purchase bills — cash basis: GST share of settlements dated in range
 *   (unpaid bills contribute 0; partial pays prorate). Legacy status=paid bills
 *   with no payment bridge keep full gstAmount on invoiceDate.
 * - Non-vendor expenses with GST — cash-prorated via recognizedExpenseGstExpr
 * - Expenses with vendorId OR vendorInvoiceId excluded (bill is SoT; settlement expenses are gstEnabled:false)
 */
async function gstPaidInRange(start, end) {
  const [expenseRows, vendorSettlements, legacyVendorBills] = await Promise.all([
    FinanceExpenses.aggregate([
      {
        $match: {
          date: { $gte: start, $lt: end },
          status: "approved",
          gstEnabled: true,
          isDeleted: { $ne: true },
          $and: [
            { $or: [{ vendorId: null }, { vendorId: { $exists: false } }] },
            { $or: [{ vendorInvoiceId: null }, { vendorInvoiceId: { $exists: false } }] },
          ],
        },
      },
      { $addFields: { _gstPaid: recognizedExpenseGstExpr() } },
      { $group: { _id: null, total: { $sum: "$_gstPaid" } } },
    ]),
    FinancePayments.find({
      date: { $gte: start, $lt: end },
      status: "completed",
      direction: "outgoing",
      vendorInvoiceId: { $ne: null },
    })
      .select({ amount: 1, vendorInvoiceId: 1 })
      .lean(),
    FinanceVendorInvoices.find({
      invoiceDate: { $gte: start, $lt: end },
      status: "paid",
      gstEnabled: true,
      paymentId: null,
      $or: [{ paidAmount: null }, { paidAmount: 0 }, { paidAmount: { $exists: false } }],
    })
      .select({ gstAmount: 1, gstEnabled: 1, status: 1, paymentId: 1, paidAmount: 1 })
      .lean(),
  ]);

  const invoiceIds = [
    ...new Set(vendorSettlements.map((p) => p.vendorInvoiceId).filter((id) => id != null)),
  ];
  const invoices =
    invoiceIds.length > 0
      ? await FinanceVendorInvoices.find({ id: { $in: invoiceIds } }).lean()
      : [];
  const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));

  let fromVendorSettlements = 0;
  for (const payment of vendorSettlements) {
    fromVendorSettlements += recognizedVendorInvoiceGstShare(
      invoiceById.get(payment.vendorInvoiceId),
      payment.amount,
    );
  }

  const fromLegacyVendorBills = legacyVendorBills.reduce(
    (sum, inv) => sum + legacyVendorInvoiceGst(inv),
    0,
  );

  return (expenseRows[0]?.total ?? 0) + fromVendorSettlements + fromLegacyVendorBills;
}

async function tdsDeductedInRange(startYear, startMonth, endYear, endMonth) {
  const runs = await PayrollRuns.find({ status: { $in: ["finalized", "paid"] } }).lean();
  const lowerKey = startYear * 100 + startMonth;
  const upperKey = endYear * 100 + endMonth;
  const inRange = runs.filter((r) => {
    const key = r.year * 100 + r.month;
    return key >= lowerKey && key <= upperKey;
  });
  if (!inRange.length) return 0;
  const runIds = inRange.map((r) => r.id);
  const agg = await PayrollLines.aggregate([
    { $match: { payrollRunId: { $in: runIds } } },
    { $group: { _id: null, total: { $sum: "$tds" } } },
  ]);
  return agg[0]?.total ?? 0;
}

async function taxDeposited(type, periodKey) {
  const rows = await FinanceTaxDeposits.find({ type, period: periodKey }).lean();
  return rows.reduce((s, r) => s + r.amount, 0);
}

function withGstPayableFields(gstCollected, gstPaid, gstDeposited) {
  const netGst = gstCollected - gstPaid;
  return {
    gstCollected,
    gstPaid,
    /** Alias used by dashboard KPIs. */
    gstInputCredit: gstPaid,
    netGst,
    gstDeposited,
    /** Remaining liability after challans (0 if credit position). */
    gstPayable: Math.max(0, netGst - gstDeposited),
  };
}

async function computePeriodSummary({ label, periodType, periodKey, start, end, tdsStart, tdsEnd }) {
  const [gstCollected, gstPaid, tdsDeducted, gstDeposited, tdsDeposited] = await Promise.all([
    gstCollectedInRange(start, end),
    gstPaidInRange(start, end),
    tdsDeductedInRange(tdsStart.year, tdsStart.month, tdsEnd.year, tdsEnd.month),
    taxDeposited("gst", periodKey),
    taxDeposited("tds", periodKey),
  ]);
  return {
    period: label,
    periodKey,
    periodType,
    ...withGstPayableFields(gstCollected, gstPaid, gstDeposited),
    tdsDeducted,
    tdsDeposited,
  };
}

/** Returns the last `count` periods of the given type, most recent first. */
export async function listTaxSummaries(periodType = "monthly", count = 4) {
  const now = new Date();
  const periods = [];

  if (periodType === "monthly") {
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const { start, end } = monthRange(d.getFullYear(), d.getMonth() + 1);
      periods.push({
        label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
        periodType,
        periodKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        start,
        end,
        tdsStart: { year: d.getFullYear(), month: d.getMonth() + 1 },
        tdsEnd: { year: d.getFullYear(), month: d.getMonth() + 1 },
      });
    }
  } else if (periodType === "quarterly") {
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    for (let i = 0; i < count; i++) {
      let q = currentQuarter - i;
      let y = now.getFullYear();
      while (q < 1) {
        q += 4;
        y -= 1;
      }
      const { start, end } = quarterRange(y, q);
      const startMonth = (q - 1) * 3 + 1;
      periods.push({
        label: `Q${q} ${y}`,
        periodType,
        periodKey: `${y}-Q${q}`,
        start,
        end,
        tdsStart: { year: y, month: startMonth },
        tdsEnd: { year: y, month: startMonth + 2 },
      });
    }
  } else {
    const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    for (let i = 0; i < count; i++) {
      const fyStart = currentFyStart - i;
      const { start, end } = fiscalYearRange(fyStart);
      periods.push({
        label: `FY ${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`,
        periodType,
        periodKey: `FY${fyStart}`,
        start,
        end,
        tdsStart: { year: fyStart, month: 4 },
        tdsEnd: { year: fyStart + 1, month: 3 },
      });
    }
  }

  return Promise.all(periods.map(computePeriodSummary));
}

/**
 * Dashboard snapshot for one calendar month (matches finance KPI period filter).
 */
export async function getGstKpiForMonth(year, month) {
  const { start, end } = monthRange(year, month);
  const periodKey = `${year}-${String(month).padStart(2, "0")}`;
  const [gstCollected, gstPaid, gstDeposited] = await Promise.all([
    gstCollectedInRange(start, end),
    gstPaidInRange(start, end),
    taxDeposited("gst", periodKey),
  ]);
  return {
    ...withGstPayableFields(gstCollected, gstPaid, gstDeposited),
    periodKey,
  };
}

export {
  gstCollectedInRange,
  gstPaidInRange,
  withGstPayableFields,
};
