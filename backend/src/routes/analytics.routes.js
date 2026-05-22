import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as analyticsController from "@/controllers/analytics.controller";
const router = Router();
router.get("/analytics/dashboard", requireAuth, requireRole("super_admin"), asyncHandler(analyticsController.getAnalyticsDashboard));
router.get("/analytics/projects/:id", requireAuth, asyncHandler(analyticsController.getAnalyticsProjectsById));
router.get("/analytics/team", requireAuth, requireRole("super_admin"), asyncHandler(analyticsController.getAnalyticsTeam));
router.get("/analytics/bugs", requireAuth, asyncHandler(analyticsController.getAnalyticsBugs));
router.get("/analytics/companies", requireAuth, requireRole("super_admin"), asyncHandler(analyticsController.getAnalyticsCompanies));
var stdin_default = router;
export {
  stdin_default as default
};
