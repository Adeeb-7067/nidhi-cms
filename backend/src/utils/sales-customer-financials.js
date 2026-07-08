import {
  isBillableInvoice,
  sumInvoiceBilled,
  sumInvoiceCollected,
  sumInvoiceOutstanding,
} from "./sales-invoice-filters.js";

export function sumInstallmentScheduled(installments) {
  return (installments ?? []).reduce((sum, row) => sum + (row.dueAmount ?? 0), 0);
}

export function sumInstallmentCollected(installments) {
  return (installments ?? []).reduce((sum, row) => sum + (row.paidAmount ?? 0), 0);
}

export function sumInstallmentOutstanding(installments) {
  return (installments ?? []).reduce(
    (sum, row) => sum + Math.max(0, (row.dueAmount ?? 0) - (row.paidAmount ?? 0)),
    0,
  );
}

/** Milestone schedule totals when installments exist; otherwise invoice totals. */
export function resolveCustomerFinancials(installments, invoices) {
  if (installments?.length) {
    return {
      totalSales: sumInstallmentScheduled(installments),
      totalCollected: sumInstallmentCollected(installments),
      outstanding: sumInstallmentOutstanding(installments),
      source: "installments",
    };
  }
  const totalSales = sumInvoiceBilled(invoices);
  const outstanding = sumInvoiceOutstanding(invoices);
  return {
    totalSales,
    totalCollected: sumInvoiceCollected(invoices),
    outstanding,
    source: "invoices",
  };
}

export function computeCustomerFinancials(invoices) {
  const financials = new Map();
  for (const inv of invoices) {
    if (!isBillableInvoice(inv)) continue;
    if (!financials.has(inv.customerId)) {
      financials.set(inv.customerId, { totalSales: 0, totalCollected: 0, outstanding: 0 });
    }
    const entry = financials.get(inv.customerId);
    entry.totalSales += inv.amount ?? 0;
    entry.totalCollected += inv.paidAmount ?? 0;
    entry.outstanding += Math.max(0, (inv.amount ?? 0) - (inv.paidAmount ?? 0));
  }
  return financials;
}

export async function loadCustomerFinancialsMap(SalesInstallments, SalesInvoices, customerIds) {
  const financials = new Map();
  if (!customerIds.length) return financials;

  const installmentRows = await SalesInstallments.aggregate([
    { $match: { customerId: { $in: customerIds } } },
    {
      $group: {
        _id: "$customerId",
        totalSales: { $sum: "$dueAmount" },
        totalCollected: { $sum: "$paidAmount" },
        outstanding: { $sum: { $subtract: ["$dueAmount", "$paidAmount"] } },
      },
    },
  ]);

  const customersWithInstallments = new Set();
  for (const row of installmentRows) {
    customersWithInstallments.add(row._id);
    financials.set(row._id, {
      totalSales: row.totalSales ?? 0,
      totalCollected: row.totalCollected ?? 0,
      outstanding: Math.max(0, row.outstanding ?? 0),
    });
  }

  const invoiceOnlyIds = customerIds.filter((id) => !customersWithInstallments.has(id));
  if (invoiceOnlyIds.length) {
    const invoices = await SalesInvoices.find({ customerId: { $in: invoiceOnlyIds } })
      .select({ customerId: 1, amount: 1, paidAmount: 1, status: 1 })
      .lean();
    for (const [customerId, data] of computeCustomerFinancials(invoices)) {
      financials.set(customerId, data);
    }
  }

  return financials;
}
