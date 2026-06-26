import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as configCtrl from "../controllers/sales/config.controller.js";
import * as leadsCtrl from "../controllers/sales/leads.controller.js";
import * as followupsCtrl from "../controllers/sales/followups.controller.js";
import * as proposalsCtrl from "../controllers/sales/proposals.controller.js";
import * as customersCtrl from "../controllers/sales/customers.controller.js";
import * as installmentsCtrl from "../controllers/sales/installments.controller.js";
import * as invoicesCtrl from "../controllers/sales/invoices.controller.js";
import * as paymentsCtrl from "../controllers/sales/payments.controller.js";
import * as productsCtrl from "../controllers/sales/products.controller.js";
import * as dashboardCtrl from "../controllers/sales/dashboard.controller.js";

const router = Router();
const wrap = (fn) => asyncHandler(fn);
const guard = [requireAuth, requireRole("super_admin", "bde")];

// ── Config (dynamic dropdowns) ──────────────────────────────────────────────
router.get("/sales/config", ...guard, wrap(configCtrl.getConfig));
router.post("/sales/config", ...guard, wrap(configCtrl.postConfig));
router.delete("/sales/config/:id", ...guard, wrap(configCtrl.deleteConfig));

// ── Leads ──────────────────────────────────────────────────────────────────
router.get("/sales/leads", ...guard, wrap(leadsCtrl.listLeads));
router.post("/sales/leads", ...guard, wrap(leadsCtrl.createLead));
router.patch("/sales/leads/bulk", ...guard, wrap(leadsCtrl.bulkUpdateLeads)); // before /:id
router.get("/sales/leads/:id", ...guard, wrap(leadsCtrl.getLeadById));
router.patch("/sales/leads/:id", ...guard, wrap(leadsCtrl.updateLead));
router.delete("/sales/leads/:id", ...guard, wrap(leadsCtrl.deleteLead));
router.post("/sales/leads/:id/convert", ...guard, wrap(leadsCtrl.convertLead));
router.get("/sales/leads/:id/activity", ...guard, wrap(leadsCtrl.getLeadActivity));
router.post("/sales/leads/:id/reminder", ...guard, wrap(leadsCtrl.setReminder));

// ── Follow-ups ─────────────────────────────────────────────────────────────
router.get("/sales/follow-ups", ...guard, wrap(followupsCtrl.listFollowUps));
router.post("/sales/follow-ups", ...guard, wrap(followupsCtrl.createFollowUp));
router.patch("/sales/follow-ups/:id", ...guard, wrap(followupsCtrl.updateFollowUp));
router.post("/sales/follow-ups/:id/complete", ...guard, wrap(followupsCtrl.completeFollowUp));

// ── Proposals ─────────────────────────────────────────────────────────────
router.get("/sales/proposals", ...guard, wrap(proposalsCtrl.listProposals));
router.post("/sales/proposals", ...guard, wrap(proposalsCtrl.createProposal));
// Public view — no auth (must come before /:id to avoid token being parsed as id)
router.get("/sales/proposals/view/:token", wrap(proposalsCtrl.viewProposal));
router.get("/sales/proposals/:id", ...guard, wrap(proposalsCtrl.getProposalById));
router.patch("/sales/proposals/:id", ...guard, wrap(proposalsCtrl.updateProposal));
router.post("/sales/proposals/:id/send", ...guard, wrap(proposalsCtrl.sendProposal));
router.post("/sales/proposals/:id/approve", ...guard, wrap(proposalsCtrl.approveProposal));
router.post("/sales/proposals/:id/decline", ...guard, wrap(proposalsCtrl.declineProposal));
router.post("/sales/proposals/:id/counter", ...guard, wrap(proposalsCtrl.counterProposal));
router.post("/sales/proposals/:id/revise", ...guard, wrap(proposalsCtrl.reviseProposal));

// ── Customers ─────────────────────────────────────────────────────────────
router.get("/sales/customers", ...guard, wrap(customersCtrl.listCustomers));
router.post("/sales/customers", ...guard, wrap(customersCtrl.createCustomer));
router.get("/sales/customers/:id", ...guard, wrap(customersCtrl.getCustomerById));
router.patch("/sales/customers/:id", ...guard, wrap(customersCtrl.updateCustomer));
router.get("/sales/customers/:id/statement", ...guard, wrap(customersCtrl.getCustomerStatement));
router.post("/sales/customers/:id/remind", ...guard, wrap(customersCtrl.remindCustomer));

// ── Installments ──────────────────────────────────────────────────────────
router.get("/sales/installments", ...guard, wrap(installmentsCtrl.listInstallments));
router.post("/sales/installments", ...guard, wrap(installmentsCtrl.createInstallment));
router.get("/sales/installments/:id", ...guard, wrap(installmentsCtrl.getInstallmentById));
router.patch("/sales/installments/:id", ...guard, wrap(installmentsCtrl.updateInstallment));

// ── Invoices ──────────────────────────────────────────────────────────────
router.get("/sales/invoices", ...guard, wrap(invoicesCtrl.listInvoices));
router.post("/sales/invoices", ...guard, wrap(invoicesCtrl.createInvoice));
// from-proposal must be before /:id
router.post("/sales/invoices/from-proposal/:proposalId", ...guard, wrap(invoicesCtrl.createInvoiceFromProposal));
router.get("/sales/invoices/:id", ...guard, wrap(invoicesCtrl.getInvoiceById));
router.patch("/sales/invoices/:id", ...guard, wrap(invoicesCtrl.updateInvoice));

// ── Payments & Receipts ───────────────────────────────────────────────────
router.get("/sales/payments", ...guard, wrap(paymentsCtrl.listPayments));
router.post("/sales/payments", ...guard, wrap(paymentsCtrl.recordPayment));
router.get("/sales/payments/:id", ...guard, wrap(paymentsCtrl.getReceiptById));

// ── Products ──────────────────────────────────────────────────────────────
router.get("/sales/products", ...guard, wrap(productsCtrl.listProducts));
router.post("/sales/products", ...guard, wrap(productsCtrl.createProduct));
router.patch("/sales/products/:id", ...guard, wrap(productsCtrl.updateProduct));

// ── Dashboard ─────────────────────────────────────────────────────────────
router.get("/sales/dashboard", ...guard, wrap(dashboardCtrl.getDashboard));
router.get("/sales/dashboard/pipeline", ...guard, wrap(dashboardCtrl.getPipeline));
router.get("/sales/dashboard/revenue-trend", ...guard, wrap(dashboardCtrl.getRevenueTrend));

export default router;
