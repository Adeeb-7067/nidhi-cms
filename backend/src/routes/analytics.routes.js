import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as analyticsController from "../controllers/analytics.controller.js";
const router = Router();
router.get("/analytics/dashboard", requireAuth, requireRole("super_admin"), asyncHandler(analyticsController.getAnalyticsDashboard));
router.get(
  "/analytics/workspace",
  requireAuth,
  requireRole("developer", "tester", "qa", "freelancer", "super_admin"),
  asyncHandler(analyticsController.getAnalyticsWorkspace),
);
router.get(
  "/analytics/client-hub",
  requireAuth,
  requireRole("client"),
  asyncHandler(analyticsController.getAnalyticsClientHub),
);
router.get("/analytics/projects/:id", requireAuth, asyncHandler(analyticsController.getAnalyticsProjectsById));
router.get("/analytics/team", requireAuth, requireRole("super_admin"), asyncHandler(analyticsController.getAnalyticsTeam));
router.get("/analytics/bugs", requireAuth, asyncHandler(analyticsController.getAnalyticsBugs));
router.get("/analytics/companies", requireAuth, requireRole("super_admin"), asyncHandler(analyticsController.getAnalyticsCompanies));
var stdin_default = router;
export {
  stdin_default as default
};
