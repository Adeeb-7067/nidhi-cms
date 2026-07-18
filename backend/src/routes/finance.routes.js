import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../middlewares/auth.js";
import { requirePermission, requireAnyPermission } from "../middlewares/permission.js";
import * as dashboardCtrl from "../controllers/finance/dashboard.controller.js";
import * as expensesCtrl from "../controllers/finance/expenses.controller.js";
import * as incomeCtrl from "../controllers/finance/income.controller.js";
import * as invoicesCtrl from "../controllers/finance/invoices.controller.js";
import * as paymentsCtrl from "../controllers/finance/payments.controller.js";
import * as budgetsCtrl from "../controllers/finance/budgets.controller.js";
import * as loansCtrl from "../controllers/finance/loans.controller.js";
import * as subscriptionsCtrl from "../controllers/finance/subscriptions.controller.js";
import * as chequesCtrl from "../controllers/finance/cheques.controller.js";
import * as ledgersCtrl from "../controllers/finance/ledgers.controller.js";
import * as taxCtrl from "../controllers/finance/tax.controller.js";
import * as reportsCtrl from "../controllers/finance/reports.controller.js";
import * as vendorsCtrl from "../controllers/finance/vendors.controller.js";
import * as notificationsCtrl from "../controllers/finance/notifications.controller.js";
import * as syncCtrl from "../controllers/finance/sync.controller.js";

const router = Router();
const wrap = (fn) => asyncHandler(fn);
const p = (module, action = "view") => [requireAuth, requirePermission(module, action)];
const anyP = (...checks) => [requireAuth, requireAnyPermission(...checks)];

// ── Dashboard ────────────────────────────────────────────────────────────
router.get("/finance/dashboard", ...p("finance_dashboard"), wrap(dashboardCtrl.getDashboard));
router.get("/finance/dashboard/revenue-trend", ...p("finance_dashboard"), wrap(dashboardCtrl.getRevenueTrend));
router.get("/finance/dashboard/expense-breakdown", ...p("finance_dashboard"), wrap(dashboardCtrl.getExpenseBreakdown));

// ── Expenses ─────────────────────────────────────────────────────────────
router.get("/finance/expenses", ...p("finance_expenses"), wrap(expensesCtrl.listExpenses));
router.post("/finance/expenses", ...p("finance_expenses", "create"), wrap(expensesCtrl.createExpense));
router.get("/finance/expenses/:id", ...p("finance_expenses"), wrap(expensesCtrl.getExpenseById));
router.patch("/finance/expenses/:id", ...p("finance_expenses", "edit"), wrap(expensesCtrl.updateExpense));
router.post("/finance/expenses/:id/approve", ...p("finance_expenses", "edit"), wrap(expensesCtrl.approveExpense));
router.post("/finance/expenses/:id/reject", ...p("finance_expenses", "edit"), wrap(expensesCtrl.rejectExpense));
router.post(
  "/finance/expenses/:id/payments",
  ...anyP(["finance_expenses", "edit"], ["finance_payments", "create"]),
  wrap(expensesCtrl.payExpenseRemaining),
);
router.delete("/finance/expenses/:id", ...p("finance_expenses", "delete"), wrap(expensesCtrl.deleteExpense));

// ── Income ───────────────────────────────────────────────────────────────
router.get("/finance/income", ...p("finance_income"), wrap(incomeCtrl.listIncome));
router.post("/finance/income", ...p("finance_income", "create"), wrap(incomeCtrl.recordIncome));
router.patch("/finance/income/:id", ...p("finance_income", "edit"), wrap(incomeCtrl.updateIncome));
router.delete("/finance/income/:id", ...p("finance_income", "delete"), wrap(incomeCtrl.deleteIncome));

// ── Invoices ─────────────────────────────────────────────────────────────
router.get("/finance/invoices", ...p("finance_invoices"), wrap(invoicesCtrl.listInvoices));
router.get("/finance/invoices/aging", ...p("finance_invoices"), wrap(invoicesCtrl.getInvoiceAging));
router.get("/finance/invoices/summary", ...p("finance_invoices"), wrap(invoicesCtrl.getInvoicesSummary));
router.post("/finance/invoices", ...p("finance_invoices", "create"), wrap(invoicesCtrl.createInvoice));
router.get("/finance/invoices/:id", ...p("finance_invoices"), wrap(invoicesCtrl.getInvoiceById));
router.patch("/finance/invoices/:id", ...p("finance_invoices", "edit"), wrap(invoicesCtrl.updateInvoice));
router.delete("/finance/invoices/:id", ...p("finance_invoices", "delete"), wrap(invoicesCtrl.deleteInvoice));
router.post("/finance/invoices/:id/cancel", ...p("finance_invoices", "edit"), wrap(invoicesCtrl.cancelInvoice));
router.post("/finance/invoices/:id/credit-note", ...p("finance_invoices", "edit"), wrap(invoicesCtrl.addCreditNote));
router.post("/finance/invoices/:id/remind", ...p("finance_invoices", "edit"), wrap(invoicesCtrl.remindInvoice));

// ── Payments ─────────────────────────────────────────────────────────────
router.get("/finance/payments", ...p("finance_payments"), wrap(paymentsCtrl.listPayments));
router.get("/finance/payments/summary", ...p("finance_payments"), wrap(paymentsCtrl.getPaymentsSummary));
router.post("/finance/payments", ...p("finance_payments", "create"), wrap(paymentsCtrl.recordPayment));
router.get("/finance/payments/:id", ...p("finance_payments"), wrap(paymentsCtrl.getPaymentById));
router.patch("/finance/payments/:id", ...p("finance_payments", "edit"), wrap(paymentsCtrl.updatePayment));
router.delete("/finance/payments/:id", ...p("finance_payments", "delete"), wrap(paymentsCtrl.deletePayment));

// ── Budgets ──────────────────────────────────────────────────────────────
router.get("/finance/budgets", ...p("finance_budgets"), wrap(budgetsCtrl.listBudgets));
router.post("/finance/budgets", ...p("finance_budgets", "create"), wrap(budgetsCtrl.createBudget));
router.patch("/finance/budgets/:id", ...p("finance_budgets", "edit"), wrap(budgetsCtrl.updateBudget));
router.delete("/finance/budgets/:id", ...p("finance_budgets", "delete"), wrap(budgetsCtrl.deleteBudget));

// ── Loans ────────────────────────────────────────────────────────────────
// List is also readable from Expenses so repayments can pick an active loan.
router.get(
  "/finance/loans",
  ...anyP(["finance_loans", "view"], ["finance_expenses", "view"]),
  wrap(loansCtrl.listLoans),
);
router.post("/finance/loans", ...p("finance_loans", "create"), wrap(loansCtrl.createLoan));
router.get("/finance/loans/:id", ...p("finance_loans"), wrap(loansCtrl.getLoanById));
router.post(
  "/finance/loans/:id/installments",
  ...anyP(["finance_loans", "create"], ["finance_expenses", "create"]),
  wrap(loansCtrl.recordInstallment),
);
router.patch("/finance/loans/:id", ...p("finance_loans", "edit"), wrap(loansCtrl.updateLoan));
router.delete("/finance/loans/:id", ...p("finance_loans", "delete"), wrap(loansCtrl.deleteLoan));

// ── Software subscriptions ───────────────────────────────────────────────
router.get(
  "/finance/subscriptions",
  ...anyP(["finance_subscriptions", "view"], ["finance_expenses", "view"]),
  wrap(subscriptionsCtrl.listSubscriptions),
);
router.post("/finance/subscriptions", ...p("finance_subscriptions", "create"), wrap(subscriptionsCtrl.createSubscription));
router.get("/finance/subscriptions/:id", ...p("finance_subscriptions"), wrap(subscriptionsCtrl.getSubscriptionById));
router.patch("/finance/subscriptions/:id", ...p("finance_subscriptions", "edit"), wrap(subscriptionsCtrl.updateSubscription));
router.delete("/finance/subscriptions/:id", ...p("finance_subscriptions", "delete"), wrap(subscriptionsCtrl.deleteSubscription));
router.post(
  "/finance/subscriptions/:id/assign",
  ...p("finance_subscriptions", "edit"),
  wrap(subscriptionsCtrl.assignSeat),
);
router.post(
  "/finance/subscriptions/:id/assignments/:assignmentId/revoke",
  ...p("finance_subscriptions", "edit"),
  wrap(subscriptionsCtrl.revokeSeat),
);
router.post(
  "/finance/subscriptions/:id/payments",
  ...anyP(["finance_subscriptions", "create"], ["finance_expenses", "create"]),
  wrap(subscriptionsCtrl.recordPayment),
);

// ── Cheques ──────────────────────────────────────────────────────────────
router.get("/finance/cheques", ...p("finance_cheques"), wrap(chequesCtrl.listCheques));
router.post("/finance/cheques", ...p("finance_cheques", "create"), wrap(chequesCtrl.createCheque));
router.get("/finance/cheques/forecast/clearance", ...p("finance_cheques"), wrap(chequesCtrl.getClearanceForecast));
router.get("/finance/cheques/:id", ...p("finance_cheques"), wrap(chequesCtrl.getChequeById));
router.patch("/finance/cheques/:id", ...p("finance_cheques", "edit"), wrap(chequesCtrl.updateCheque));
router.post("/finance/cheques/:id/clear", ...p("finance_cheques", "edit"), wrap(chequesCtrl.clearCheque));
router.post("/finance/cheques/:id/cancel", ...p("finance_cheques", "edit"), wrap(chequesCtrl.cancelCheque));
router.post("/finance/cheques/:id/bounce", ...p("finance_cheques", "edit"), wrap(chequesCtrl.bounceCheque));
router.post("/finance/cheques/:id/re-present", ...p("finance_cheques", "edit"), wrap(chequesCtrl.rePresentCheque));

// ── Ledgers ──────────────────────────────────────────────────────────────
router.get("/finance/ledgers/clients", ...p("finance_ledgers"), wrap(ledgersCtrl.getClientLedgers));
router.get("/finance/ledgers/clients/:id", ...p("finance_ledgers"), wrap(ledgersCtrl.getClientLedgers));
router.get("/finance/ledgers/vendors", ...p("finance_ledgers"), wrap(ledgersCtrl.getVendorLedgers));
router.get("/finance/ledgers/vendors/:id", ...p("finance_ledgers"), wrap(ledgersCtrl.getVendorLedgers));
router.get("/finance/ledgers/expense-categories", ...p("finance_ledgers"), wrap(ledgersCtrl.getExpenseCategoryLedgers));
router.get("/finance/ledgers/bank-accounts", ...p("finance_ledgers"), wrap(ledgersCtrl.getBankLedgers));
router.post("/finance/ledgers/bank-accounts", ...p("finance_ledgers", "create"), wrap(ledgersCtrl.createBankAccount));
router.patch("/finance/ledgers/bank-accounts/:id", ...p("finance_ledgers", "edit"), wrap(ledgersCtrl.updateBankAccount));
router.delete("/finance/ledgers/bank-accounts/:id", ...p("finance_ledgers", "delete"), wrap(ledgersCtrl.deleteBankAccount));
router.get("/finance/ledgers/bank-accounts/:id", ...p("finance_ledgers"), wrap(ledgersCtrl.getBankLedgers));

// ── Tax ──────────────────────────────────────────────────────────────────
router.get("/finance/tax/summary", ...p("finance_tax"), wrap(taxCtrl.getTaxSummary));
router.get("/finance/tax/deposits", ...p("finance_tax"), wrap(taxCtrl.listTaxDeposits));
router.post("/finance/tax/deposits", ...p("finance_tax", "create"), wrap(taxCtrl.createTaxDeposit));
router.patch("/finance/tax/deposits/:id", ...p("finance_tax", "edit"), wrap(taxCtrl.updateTaxDeposit));
router.delete("/finance/tax/deposits/:id", ...p("finance_tax", "delete"), wrap(taxCtrl.deleteTaxDeposit));

// ── Reports ──────────────────────────────────────────────────────────────
router.get("/finance/reports/pnl", ...p("finance_reports"), wrap(reportsCtrl.getPnl));
router.get("/finance/reports/profitability", ...p("finance_reports"), wrap(reportsCtrl.getProfitability));
// Shown on the Expenses page → gated by finance_expenses so page viewers can load it.
router.get("/finance/reports/department-payroll", ...p("finance_expenses"), wrap(reportsCtrl.getDepartmentPayroll));

// ── Vendors ──────────────────────────────────────────────────────────────
router.get("/finance/vendors", ...p("finance_vendors"), wrap(vendorsCtrl.listVendors));
router.get("/finance/vendors/analytics", ...p("finance_vendors"), wrap(vendorsCtrl.getVendorAnalytics));
router.get("/finance/vendors/:id", ...p("finance_vendors"), wrap(vendorsCtrl.getVendorById));
router.post("/finance/vendors", ...p("finance_vendors", "create"), wrap(vendorsCtrl.createVendor));
router.patch("/finance/vendors/:id", ...p("finance_vendors", "edit"), wrap(vendorsCtrl.updateVendor));
router.delete("/finance/vendors/:id", ...p("finance_vendors", "delete"), wrap(vendorsCtrl.deleteVendor));

// ── Notifications ────────────────────────────────────────────────────────
router.get("/finance/notifications", ...p("finance_notifications"), wrap(notificationsCtrl.getFinanceNotifications));
router.post(
  "/finance/notifications/mark-all-read",
  ...p("finance_notifications", "edit"),
  wrap(notificationsCtrl.markAllFinanceNotificationsRead),
);
router.post(
  "/finance/notifications/:id/read",
  ...p("finance_notifications", "edit"),
  wrap(notificationsCtrl.markFinanceNotificationRead),
);

router.post("/finance/sync/sales-payments", ...p("finance_dashboard", "edit"), wrap(syncCtrl.syncSalesPayments));

export default router;
