import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";
import * as configCtrl from "../controllers/sales/config.controller.js";
import * as settingsCtrl from "../controllers/sales/settings.controller.js";
import * as notificationsCtrl from "../controllers/sales/notifications.controller.js";
import * as leadsCtrl from "../controllers/sales/leads.controller.js";
import * as followupsCtrl from "../controllers/sales/followups.controller.js";
import * as proposalsCtrl from "../controllers/sales/proposals.controller.js";
import * as customersCtrl from "../controllers/sales/customers.controller.js";
import * as installmentsCtrl from "../controllers/sales/installments.controller.js";
import * as invoicesCtrl from "../controllers/sales/invoices.controller.js";
import * as paymentsCtrl from "../controllers/sales/payments.controller.js";
import * as productsCtrl from "../controllers/sales/products.controller.js";
import * as dashboardCtrl from "../controllers/sales/dashboard.controller.js";
import * as teamCtrl from "../controllers/sales/team.controller.js";

const router = Router();
const wrap = (fn) => asyncHandler(fn);
const p = (module, action = "view") => [requireAuth, requirePermission(module, action)];

// ── Config (dynamic dropdowns) ──────────────────────────────────────────────
router.get("/sales/config", ...p("sales_settings"), wrap(configCtrl.getConfig));
router.post("/sales/config", ...p("sales_settings", "edit"), wrap(configCtrl.postConfig));
router.delete("/sales/config/:id", ...p("sales_settings", "edit"), wrap(configCtrl.deleteConfig));

// ── App settings (numbering, tax, notifications prefs) ─────────────────────
router.get("/sales/settings", ...p("sales_settings"), wrap(settingsCtrl.getSettings));
router.patch("/sales/settings", ...p("sales_settings", "edit"), wrap(settingsCtrl.patchSettings));

// ── Sales notifications / financial alerts ───────────────────────────────────
router.get("/sales/notifications", ...p("sales_notifications"), wrap(notificationsCtrl.getSalesNotifications));
router.post("/sales/notifications/mark-all-read", ...p("sales_notifications", "edit"), wrap(notificationsCtrl.markAllSalesNotificationsRead));
router.post("/sales/notifications/:id/read", ...p("sales_notifications", "edit"), wrap(notificationsCtrl.markSalesNotificationRead));

// ── Leads ──────────────────────────────────────────────────────────────────
router.get("/sales/leads", ...p("sales_leads"), wrap(leadsCtrl.listLeads));
router.post("/sales/leads", ...p("sales_leads", "create"), wrap(leadsCtrl.createLead));
router.post("/sales/leads/import", ...p("sales_leads", "create"), wrap(leadsCtrl.importLeads));
router.patch("/sales/leads/bulk", ...p("sales_leads", "edit"), wrap(leadsCtrl.bulkUpdateLeads));
router.get("/sales/leads/:id", ...p("sales_leads"), wrap(leadsCtrl.getLeadById));
router.patch("/sales/leads/:id", ...p("sales_leads", "edit"), wrap(leadsCtrl.updateLead));
router.delete("/sales/leads/:id", ...p("sales_leads", "delete"), wrap(leadsCtrl.deleteLead));
router.post("/sales/leads/:id/convert", ...p("sales_leads", "edit"), wrap(leadsCtrl.convertLead));
router.get("/sales/leads/:id/activity", ...p("sales_leads"), wrap(leadsCtrl.getLeadActivity));
router.post("/sales/leads/:id/reminder", ...p("sales_leads", "edit"), wrap(leadsCtrl.setReminder));

// ── Follow-ups ─────────────────────────────────────────────────────────────
router.get("/sales/follow-ups", ...p("sales_follow_ups"), wrap(followupsCtrl.listFollowUps));
router.post("/sales/follow-ups", ...p("sales_follow_ups", "create"), wrap(followupsCtrl.createFollowUp));
router.patch("/sales/follow-ups/:id", ...p("sales_follow_ups", "edit"), wrap(followupsCtrl.updateFollowUp));
router.post("/sales/follow-ups/:id/complete", ...p("sales_follow_ups", "edit"), wrap(followupsCtrl.completeFollowUp));

// ── Proposals ─────────────────────────────────────────────────────────────
router.get("/sales/proposals", ...p("sales_proposals"), wrap(proposalsCtrl.listProposals));
router.post("/sales/proposals", ...p("sales_proposals", "create"), wrap(proposalsCtrl.createProposal));
// Public routes — no auth (must come before /:id)
router.get("/sales/proposals/view/:token", wrap(proposalsCtrl.viewProposal));
router.get("/sales/proposals/public/:token/comments", wrap(proposalsCtrl.listPublicComments));
router.post("/sales/proposals/public/:token/comments", wrap(proposalsCtrl.addPublicComment));
router.post("/sales/proposals/public/:token/approve", wrap(proposalsCtrl.publicApproveProposal));
router.post("/sales/proposals/public/:token/decline", wrap(proposalsCtrl.publicDeclineProposal));
router.post("/sales/proposals/public/:token/counter", wrap(proposalsCtrl.publicCounterProposal));
router.get("/sales/proposals/:id", ...p("sales_proposals"), wrap(proposalsCtrl.getProposalById));
router.patch("/sales/proposals/:id", ...p("sales_proposals", "edit"), wrap(proposalsCtrl.updateProposal));
router.delete("/sales/proposals/:id", ...p("sales_proposals", "delete"), wrap(proposalsCtrl.deleteProposal));
router.get("/sales/proposals/:id/logs", ...p("sales_proposals"), wrap(proposalsCtrl.getProposalLogs));
router.get("/sales/proposals/:id/comments", ...p("sales_proposals"), wrap(proposalsCtrl.listProposalComments));
router.post("/sales/proposals/:id/comments", ...p("sales_proposals", "edit"), wrap(proposalsCtrl.addStaffComment));
router.post("/sales/proposals/:id/send", ...p("sales_proposals", "edit"), wrap(proposalsCtrl.sendProposal));
router.post("/sales/proposals/:id/approve", ...p("sales_proposals", "edit"), wrap(proposalsCtrl.approveProposal));
router.post("/sales/proposals/:id/decline", ...p("sales_proposals", "edit"), wrap(proposalsCtrl.declineProposal));
router.post("/sales/proposals/:id/counter", ...p("sales_proposals", "edit"), wrap(proposalsCtrl.counterProposal));
router.post("/sales/proposals/:id/revise", ...p("sales_proposals", "edit"), wrap(proposalsCtrl.reviseProposal));

// ── Customers ─────────────────────────────────────────────────────────────
router.get("/sales/customers", ...p("sales_customers"), wrap(customersCtrl.listCustomers));
router.post("/sales/customers", ...p("sales_customers", "create"), wrap(customersCtrl.createCustomer));
router.get("/sales/customers/:id", ...p("sales_customers"), wrap(customersCtrl.getCustomerById));
router.patch("/sales/customers/:id", ...p("sales_customers", "edit"), wrap(customersCtrl.updateCustomer));
router.delete("/sales/customers/:id", ...p("sales_customers", "delete"), wrap(customersCtrl.deleteCustomer));
router.post("/sales/customers/:id/provision-portal", ...p("sales_customers", "edit"), wrap(customersCtrl.provisionCustomerPortal));
router.get("/sales/customers/:id/statement", ...p("sales_customers"), wrap(customersCtrl.getCustomerStatement));
router.post("/sales/customers/:id/remind", ...p("sales_customers", "edit"), wrap(customersCtrl.remindCustomer));

// ── Installments ──────────────────────────────────────────────────────────
router.get("/sales/installments", ...p("sales_installments"), wrap(installmentsCtrl.listInstallments));
router.post("/sales/installments", ...p("sales_installments", "create"), wrap(installmentsCtrl.createInstallment));
router.get("/sales/installments/:id", ...p("sales_installments"), wrap(installmentsCtrl.getInstallmentById));
router.patch("/sales/installments/:id", ...p("sales_installments", "edit"), wrap(installmentsCtrl.updateInstallment));

// ── Invoices ──────────────────────────────────────────────────────────────
router.get("/sales/invoices", ...p("sales_invoices"), wrap(invoicesCtrl.listInvoices));
router.post("/sales/invoices", ...p("sales_invoices", "create"), wrap(invoicesCtrl.createInvoice));
router.post("/sales/invoices/from-proposal/:proposalId", ...p("sales_invoices", "create"), wrap(invoicesCtrl.createInvoiceFromProposal));
router.get("/sales/invoices/:id", ...p("sales_invoices"), wrap(invoicesCtrl.getInvoiceById));
router.patch("/sales/invoices/:id", ...p("sales_invoices", "edit"), wrap(invoicesCtrl.updateInvoice));

// ── Payments & Receipts ───────────────────────────────────────────────────
router.get("/sales/payments", ...p("sales_payments"), wrap(paymentsCtrl.listPayments));
router.post("/sales/payments", ...p("sales_payments", "create"), wrap(paymentsCtrl.recordPayment));
router.get("/sales/payments/:id", ...p("sales_payments"), wrap(paymentsCtrl.getReceiptById));

// ── Products ──────────────────────────────────────────────────────────────
router.get("/sales/products", ...p("sales_products"), wrap(productsCtrl.listProducts));
router.post("/sales/products", ...p("sales_products", "create"), wrap(productsCtrl.createProduct));
router.patch("/sales/products/:id", ...p("sales_products", "edit"), wrap(productsCtrl.updateProduct));

// ── Dashboard & reports ───────────────────────────────────────────────────
router.get("/sales/dashboard", ...p("sales_dashboard"), wrap(dashboardCtrl.getDashboard));
router.get("/sales/dashboard/pipeline", ...p("sales_dashboard"), wrap(dashboardCtrl.getPipeline));
router.get("/sales/dashboard/revenue-trend", ...p("sales_dashboard"), wrap(dashboardCtrl.getRevenueTrend));
router.get("/sales/reports", ...p("sales_reports"), wrap(dashboardCtrl.getReports));
router.get("/sales/team", ...p("sales_team"), wrap(teamCtrl.getSalesTeam));
router.get("/sales/team/:userId", ...p("sales_team"), wrap(teamCtrl.getSalesTeamMember));

export default router;
