import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import * as dashboardCtrl from "./controllers/dashboard.controller.js";
import * as exportPackCtrl from "./controllers/export-pack.controller.js";
import * as tasksCtrl from "./controllers/tasks.controller.js";
import * as documentsCtrl from "./controllers/documents.controller.js";
import * as calendarCtrl from "./controllers/calendar.controller.js";
import * as noticesCtrl from "./controllers/notices.controller.js";
import * as p2 from "./controllers/phase2.controller.js";
import * as bankStatementsCtrl from "./controllers/bank-statements.controller.js";
import { assignSuspenseEntry } from "./services/suspense-assign.service.js";

const router = Router();
const wrap = (fn) => asyncHandler(fn);

const p = (action = "view") => [requireAuth, requirePermission("ca", action)];

function mountCrud(base, resource) {
  router.get(base, ...p("view"), wrap(resource.list));
  router.post(base, ...p("create"), wrap(resource.create));
  router.get(`${base}/:id`, ...p("view"), wrap(resource.getById));
  router.patch(`${base}/:id`, ...p("edit"), wrap(resource.update));
  router.delete(`${base}/:id`, ...p("delete"), wrap(resource.remove));
}

router.get("/ca/dashboard", ...p("view"), wrap(dashboardCtrl.getDashboard));
router.get("/ca/compliance-score", ...p("view"), wrap(dashboardCtrl.getComplianceScore));
router.get("/ca/export-pack", ...p("view"), wrap(exportPackCtrl.getExportPack));

router.get("/ca/tasks", ...p("view"), wrap(tasksCtrl.listTasks));
router.post("/ca/tasks", ...p("create"), wrap(tasksCtrl.createTask));
router.get("/ca/tasks/:id", ...p("view"), wrap(tasksCtrl.getTask));
router.patch("/ca/tasks/:id", ...p("edit"), wrap(tasksCtrl.updateTask));
router.delete("/ca/tasks/:id", ...p("delete"), wrap(tasksCtrl.deleteTask));

router.get("/ca/documents", ...p("view"), wrap(documentsCtrl.listDocuments));
router.post("/ca/documents", ...p("create"), wrap(documentsCtrl.createDocument));
router.get("/ca/documents/:id", ...p("view"), wrap(documentsCtrl.getDocument));
router.patch("/ca/documents/:id", ...p("edit"), wrap(documentsCtrl.updateDocument));
router.delete("/ca/documents/:id", ...p("delete"), wrap(documentsCtrl.deleteDocument));

router.get("/ca/calendar-events", ...p("view"), wrap(calendarCtrl.listEvents));
router.post("/ca/calendar-events", ...p("create"), wrap(calendarCtrl.createEvent));
router.get("/ca/calendar-events/:id", ...p("view"), wrap(calendarCtrl.getEvent));
router.patch("/ca/calendar-events/:id", ...p("edit"), wrap(calendarCtrl.updateEvent));
router.delete("/ca/calendar-events/:id", ...p("delete"), wrap(calendarCtrl.deleteEvent));

router.get("/ca/notices", ...p("view"), wrap(noticesCtrl.listNotices));
router.post("/ca/notices", ...p("create"), wrap(noticesCtrl.createNotice));
router.get("/ca/notices/:id", ...p("view"), wrap(noticesCtrl.getNotice));
router.patch("/ca/notices/:id", ...p("edit"), wrap(noticesCtrl.updateNotice));
router.delete("/ca/notices/:id", ...p("delete"), wrap(noticesCtrl.deleteNotice));

mountCrud("/ca/gst-filings", p2.gstFilings);
mountCrud("/ca/tds-returns", p2.tdsReturns);
mountCrud("/ca/tds-certificates", p2.tdsCertificates);
mountCrud("/ca/company-itr", p2.companyItr);
mountCrud("/ca/director-itr", p2.directorItr);
mountCrud("/ca/roc-filings", p2.rocFilings);
mountCrud("/ca/din-dsc", p2.dinDsc);
mountCrud("/ca/audits", p2.audits);
mountCrud("/ca/suspense", p2.suspense);
router.post("/ca/suspense/:id/assign", ...p("edit"), wrap(assignSuspenseEntry));

/** Bank statement import + match (true recon). */
router.get("/ca/bank-statements", ...p("view"), wrap(bankStatementsCtrl.listStatements));
router.post("/ca/bank-statements/import", ...p("create"), wrap(bankStatementsCtrl.importStatement));
router.post(
  "/ca/bank-statements/unmatched-payments-to-suspense",
  ...p("create"),
  wrap(bankStatementsCtrl.unmatchedPaymentsToSuspense),
);
router.get("/ca/bank-statements/:id", ...p("view"), wrap(bankStatementsCtrl.getStatement));
router.get("/ca/bank-statements/:id/lines", ...p("view"), wrap(bankStatementsCtrl.listStatementLines));
router.post("/ca/bank-statements/:id/auto-match", ...p("edit"), wrap(bankStatementsCtrl.autoMatchStatement));
router.post(
  "/ca/bank-statements/:id/to-suspense",
  ...p("create"),
  wrap(bankStatementsCtrl.unmatchedCreditsToSuspense),
);
router.delete("/ca/bank-statements/:id", ...p("delete"), wrap(bankStatementsCtrl.deleteStatement));
router.post("/ca/bank-statement-lines/:lineId/match", ...p("edit"), wrap(bankStatementsCtrl.matchLine));
router.post("/ca/bank-statement-lines/:lineId/unmatch", ...p("edit"), wrap(bankStatementsCtrl.unmatchLine));
router.post("/ca/bank-statement-lines/:lineId/ignore", ...p("edit"), wrap(bankStatementsCtrl.ignoreLine));

export default router;
