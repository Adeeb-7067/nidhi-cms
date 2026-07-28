import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../../../middlewares/auth.js";
import { requirePermission } from "../../../middlewares/permission.js";
import * as monitoringController from "../controllers/monitoring.controller.js";

const router = Router();

router.get("/monitoring/consent-status", requireAuth, asyncHandler(monitoringController.getConsentStatus));
router.post("/monitoring/consent", requireAuth, asyncHandler(monitoringController.recordConsent));
router.get("/monitoring/status", requireAuth, asyncHandler(monitoringController.getStatus));
router.get(
  "/monitoring/analytics",
  requireAuth,
  requirePermission("monitor_attendance", "view"),
  asyncHandler(monitoringController.getMonitoringAnalytics),
);
// Super-admin audit: full list of all employee consent records
router.get("/monitoring/consents", requireAuth, requireRole("super_admin"), asyncHandler(monitoringController.listConsents));

export default router;
