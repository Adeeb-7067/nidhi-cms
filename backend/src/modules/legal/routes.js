import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";
import * as dashboardCtrl from "./controllers/dashboard.controller.js";
import * as resources from "./controllers/resources.controller.js";

const router = Router();
const wrap = (fn) => asyncHandler(fn);

const p = (action = "view") => [requireAuth, requirePermission("legal", action)];

function mountCrud(base, resource) {
  router.get(base, ...p("view"), wrap(resource.list));
  router.post(base, ...p("create"), wrap(resource.create));
  router.get(`${base}/:id`, ...p("view"), wrap(resource.getById));
  router.patch(`${base}/:id`, ...p("edit"), wrap(resource.update));
  router.delete(`${base}/:id`, ...p("delete"), wrap(resource.remove));
}

router.get("/legal/dashboard", ...p("view"), wrap(dashboardCtrl.getDashboard));
router.get("/legal/compliance-score", ...p("view"), wrap(dashboardCtrl.getComplianceScore));
router.get("/legal/nda-alerts", ...p("view"), wrap(dashboardCtrl.getNdaAlerts));

mountCrud("/legal/counsel", resources.counsel);
mountCrud("/legal/cases", resources.employeeCases);
mountCrud("/legal/vendor-disputes", resources.vendorDisputes);
mountCrud("/legal/client-matters", resources.clientMatters);
mountCrud("/legal/ndas", resources.ndas);
mountCrud("/legal/agreements", resources.agreements);
mountCrud("/legal/notices", resources.notices);
mountCrud("/legal/court-cases", resources.courtCases);
mountCrud("/legal/compliance", resources.compliance);
mountCrud("/legal/expenses", resources.expenses);

export default router;
