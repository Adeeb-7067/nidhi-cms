import {
  FinanceInvoices,
  FinancePayments,
  FinanceExpenses,
  FinanceBankAccounts,
  clientsTable,
  vendorsTable,
} from "../../models/schema/index.js";
import { calcInvoiceTotal } from "../../utils/finance-totals.js";
import { EXPENSE_CATEGORY_LABELS } from "../../constants/finance-labels.js";

function buildEntriesWithBalance(rawEntries, openingBalance = 0) {
  const sorted = [...rawEntries].sort((a, b) => a.date.getTime() - b.date.getTime());
  let balance = openingBalance;
  const entries = sorted.map((e, i) => {
    balance += e.debit - e.credit;
    return { id: i + 1, ...e, balance: Math.round(balance) };
  });
  return { entries, closingBalance: Math.round(balance) };
}

/** Accounts-receivable view: one ledger account per client that has invoiced/received activity. */
export async function computeClientLedgers(clientId = null) {
  const clientFilter = clientId ? { id: clientId } : {};
  const clients = await clientsTable.find(clientFilter).select({ id: 1, companyName: 1 }).lean();
  const clientIds = clients.map((c) => c.id);
  if (!clientIds.length) return [];

  const [invoices, payments] = await Promise.all([
    FinanceInvoices.find({ clientId: { $in: clientIds }, status: { $ne: "cancelled" } }).lean(),
    FinancePayments.find({ clientId: { $in: clientIds }, direction: "incoming" }).lean(),
  ]);

  return clients
    .map((client) => {
      const clientInvoices = invoices.filter((i) => i.clientId === client.id);
      const clientPayments = payments.filter((p) => p.clientId === client.id);
      const rawEntries = [];
      for (const inv of clientInvoices) {
        const { total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
        rawEntries.push({
          date: inv.issueDate,
          description: `Invoice ${inv.number}`,
          debit: total,
          credit: 0,
          reference: inv.number,
          referenceHref: `/finance/invoices/${inv.id}`,
        });
        for (const cn of inv.creditNotes ?? []) {
          rawEntries.push({
            date: cn.date,
            description: `Credit note ${cn.id}`,
            debit: 0,
            credit: cn.amount,
            reference: cn.id,
          });
        }
      }
      for (const pay of clientPayments) {
        rawEntries.push({
          date: pay.date,
          description: "Payment received",
          debit: 0,
          credit: pay.amount,
          reference: pay.reference,
        });
      }
      const { entries, closingBalance } = buildEntriesWithBalance(rawEntries, 0);
      return {
        id: client.id,
        name: client.companyName,
        type: "client",
        openingBalance: 0,
        closingBalance,
        entries,
      };
    })
    .filter((account) => clientId != null || account.entries.length > 0);
}

/** Accounts-payable view: one ledger account per vendor with billed/paid activity. */
export async function computeVendorLedgers(vendorId = null) {
  const vendorFilter = vendorId ? { id: vendorId } : {};
  const vendors = await vendorsTable.find(vendorFilter).select({ id: 1, companyName: 1 }).lean();
  const vendorIds = vendors.map((v) => v.id);
  if (!vendorIds.length) return [];

  const [expenses, payments] = await Promise.all([
    FinanceExpenses.find({ vendorId: { $in: vendorIds }, status: "approved" }).lean(),
    FinancePayments.find({ vendorId: { $in: vendorIds }, direction: "outgoing" }).lean(),
  ]);

  return vendors
    .map((vendor) => {
      const vendorExpenses = expenses.filter((e) => e.vendorId === vendor.id);
      const vendorPayments = payments.filter((p) => p.vendorId === vendor.id);
      const rawEntries = [
        ...vendorExpenses.map((e) => ({
          date: e.date,
          description: e.notes || EXPENSE_CATEGORY_LABELS[e.category] || "Expense",
          debit: 0,
          credit: e.amount,
          reference: e.reference,
          referenceHref: `/finance/expenses`,
        })),
        ...vendorPayments.map((p) => ({
          date: p.date,
          description: "Payment made",
          debit: p.amount,
          credit: 0,
          reference: p.reference,
        })),
      ];
      const { entries, closingBalance } = buildEntriesWithBalance(rawEntries, 0);
      return {
        id: vendor.id,
        name: vendor.companyName,
        type: "vendor",
        openingBalance: 0,
        closingBalance,
        entries,
      };
    })
    .filter((account) => vendorId != null || account.entries.length > 0);
}

/** One rollup ledger per expense category, approved spend only. */
export async function computeExpenseCategoryLedgers() {
  const expenses = await FinanceExpenses.find({ status: "approved" }).lean();
  const byCategory = new Map();
  for (const e of expenses) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category).push(e);
  }
  return [...byCategory.entries()].map(([category, rows]) => {
    const rawEntries = rows.map((e) => ({
      date: e.date,
      description: e.notes || e.reference,
      debit: e.amount,
      credit: 0,
      reference: e.reference,
    }));
    const { entries, closingBalance } = buildEntriesWithBalance(rawEntries, 0);
    return {
      id: category,
      name: EXPENSE_CATEGORY_LABELS[category] ?? category,
      type: "expense",
      openingBalance: 0,
      closingBalance,
      entries,
    };
  });
}

/** Cash-position view: one ledger per bank account, incoming/outgoing FinancePayments tagged to it. */
export async function computeBankLedgers(bankAccountId = null) {
  const filter = bankAccountId ? { id: bankAccountId } : {};
  const accounts = await FinanceBankAccounts.find(filter).lean();
  if (!accounts.length) return [];
  const accountIds = accounts.map((a) => a.id);
  const payments = await FinancePayments.find({ bankAccountId: { $in: accountIds } }).lean();

  return accounts.map((account) => {
    const accountPayments = payments.filter((p) => p.bankAccountId === account.id);
    const rawEntries = accountPayments.map((p) => ({
      date: p.date,
      description: p.partyName,
      debit: p.direction === "incoming" ? p.amount : 0,
      credit: p.direction === "outgoing" ? p.amount : 0,
      reference: p.reference,
    }));
    const { entries, closingBalance } = buildEntriesWithBalance(rawEntries, account.openingBalance);
    return {
      id: account.id,
      name: account.name,
      type: "bank",
      openingBalance: account.openingBalance,
      closingBalance,
      entries,
    };
  });
}
