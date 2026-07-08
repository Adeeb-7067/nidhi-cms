import {
  SalesInstallments,
  SalesPayments,
  SalesInvoices,
  SalesProposals,
  clientsTable,
} from "../../models/schema/index.js";

/**
 * "Sales" = deals whose installment plan has been created (proposal → approved →
 * installments generated). "Collected" = money actually received via invoice
 * payments. A payment counts as "new project money" if the underlying proposal
 * (or invoice, when there's no proposal) was created on/after periodStart —
 * i.e. it's revenue from a deal closed this period — otherwise it's collection
 * on an older/previous deal.
 *
 * @param {object} opts
 * @param {object} [opts.installmentFilter] extra Mongo match merged into the installment query (e.g. BDE/customer scope)
 * @param {object} [opts.paymentFilter] extra Mongo match merged into the payment query (e.g. BDE/customer scope)
 * @param {Date} [opts.periodStart] inclusive lower bound; omit for all-time
 * @param {Date} [opts.periodEnd] exclusive upper bound; omit for open-ended
 */
export async function computeSalesKpis({
  installmentFilter = {},
  paymentFilter = {},
  periodStart = null,
  periodEnd = null,
} = {}) {
  const dateMatch = {};
  if (periodStart || periodEnd) {
    dateMatch.createdAt = {};
    if (periodStart) dateMatch.createdAt.$gte = periodStart;
    if (periodEnd) dateMatch.createdAt.$lt = periodEnd;
  }

  const installmentMatch = { ...installmentFilter, ...dateMatch };
  // Only default to "must have a proposal" when the caller hasn't already
  // constrained proposalId themselves (e.g. scoping to a BDE's own proposals) —
  // a literal { $ne: null } written after the spread would otherwise silently
  // clobber that scope.
  if (installmentMatch.proposalId === undefined) {
    installmentMatch.proposalId = { $ne: null };
  }

  const [salesAgg, payments] = await Promise.all([
    SalesInstallments.aggregate([
      { $match: installmentMatch },
      { $group: { _id: "$proposalId", value: { $sum: "$dueAmount" } } },
    ]),
    SalesPayments.find({ ...paymentFilter, ...dateMatch }).select({ amount: 1, invoiceId: 1 }).lean(),
  ]);

  const salesCount = salesAgg.length;
  const salesValue = salesAgg.reduce((sum, row) => sum + row.value, 0);

  const invoiceIds = [...new Set(payments.map((p) => p.invoiceId))];
  const invoices = invoiceIds.length
    ? await SalesInvoices.find({ id: { $in: invoiceIds } }).select({ id: 1, proposalId: 1, createdAt: 1 }).lean()
    : [];
  const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

  const proposalIds = [...new Set(invoices.map((inv) => inv.proposalId).filter(Boolean))];
  const proposals = proposalIds.length
    ? await SalesProposals.find({ id: { $in: proposalIds } }).select({ id: 1, createdAt: 1 }).lean()
    : [];
  const proposalMap = new Map(proposals.map((p) => [p.id, p]));

  const cutoff = periodStart ?? new Date(0);
  let totalCollected = 0;
  let newProjectMoney = 0;
  let oldProjectMoney = 0;
  for (const payment of payments) {
    totalCollected += payment.amount;
    const invoice = invoiceMap.get(payment.invoiceId);
    const proposal = invoice?.proposalId ? proposalMap.get(invoice.proposalId) : null;
    const projectCreatedAt = proposal?.createdAt ?? invoice?.createdAt ?? null;
    if (projectCreatedAt && new Date(projectCreatedAt) >= cutoff) {
      newProjectMoney += payment.amount;
    } else {
      oldProjectMoney += payment.amount;
    }
  }

  return { salesCount, salesValue, totalCollected, newProjectMoney, oldProjectMoney };
}

/**
 * Outstanding-overdue balance per customer — invoices are the source of truth
 * once billed; un-invoiced overdue installments (no invoice generated yet)
 * are added separately so the two never double-count the same debt.
 *
 * Returns `{ rows, totalAmount }` — `rows` is capped at `topN` for display,
 * `totalAmount` is the true sum across every overdue customer so a UI badge
 * summing only `rows` doesn't silently undercount past the cap.
 *
 * @param {object} [scope] extra Mongo match merged into both queries (e.g. `{ customerId: { $in: [...] } }`)
 * @param {number} [topN] max rows to return, sorted by overdue amount desc
 */
export async function computeOverdueByCustomer(scope = {}, topN = 10) {
  // Callers of this function (dashboard/team-member endpoints) never visit the
  // Installments/Invoices list pages first, so the "overdue" status flag needs
  // its own refresh here too — mirrors the exact filters those list endpoints use.
  await Promise.all([
    SalesInstallments.updateMany(
      { status: { $in: ["pending", "partial"] }, dueDate: { $lt: new Date() } },
      { $set: { status: "overdue" } },
    ),
    SalesInvoices.updateMany(
      { status: "unpaid", dueDate: { $lt: new Date() } },
      { $set: { status: "overdue" } },
    ),
  ]);

  const [overdueInvoices, overdueBareInstallments] = await Promise.all([
    SalesInvoices.aggregate([
      { $match: { status: "overdue", ...scope } },
      { $group: { _id: "$customerId", amount: { $sum: { $subtract: ["$amount", "$paidAmount"] } } } },
    ]),
    SalesInstallments.aggregate([
      { $match: { status: "overdue", invoiceId: null, ...scope } },
      { $group: { _id: "$customerId", amount: { $sum: { $subtract: ["$dueAmount", "$paidAmount"] } } } },
    ]),
  ]);

  const totals = new Map();
  for (const row of overdueInvoices) totals.set(row._id, (totals.get(row._id) ?? 0) + row.amount);
  for (const row of overdueBareInstallments) totals.set(row._id, (totals.get(row._id) ?? 0) + row.amount);

  const customerIds = [...totals.keys()];
  const customers = customerIds.length
    ? await clientsTable.find({ id: { $in: customerIds } }).select({ id: 1, companyName: 1, contactPerson: 1 }).lean()
    : [];
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const sorted = [...totals.entries()]
    .map(([customerId, overdueAmount]) => ({
      customerId,
      companyName: customerMap.get(customerId)?.companyName ?? `Customer #${customerId}`,
      contactPerson: customerMap.get(customerId)?.contactPerson ?? null,
      overdueAmount,
    }))
    .filter((row) => row.overdueAmount > 0)
    .sort((a, b) => b.overdueAmount - a.overdueAmount);

  const totalAmount = sorted.reduce((sum, row) => sum + row.overdueAmount, 0);
  return { rows: sorted.slice(0, topN), totalAmount };
}
