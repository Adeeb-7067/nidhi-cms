import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../../../middlewares/auth.js";
import { requirePermission } from "../../../middlewares/permission.js";
import * as alertsController from "../controllers/alerts.controller.js";

const router = Router();
const p = (action = "view") => [requireAuth, requirePermission("admin_alerts", action)];

router.get("/alerts/pending", requireAuth, asyncHandler(alertsController.getAlertsPending));
router.post("/alerts/:id/dismiss", requireAuth, asyncHandler(alertsController.postAlertsDismiss));

router.get("/alerts", ...p(), asyncHandler(alertsController.getAlerts));
router.post("/alerts", ...p("create"), asyncHandler(alertsController.postAlerts));
router.patch("/alerts/:id", ...p("edit"), asyncHandler(alertsController.patchAlertsById));
router.delete("/alerts/:id", ...p("delete"), asyncHandler(alertsController.deleteAlertsById));

export default router;
