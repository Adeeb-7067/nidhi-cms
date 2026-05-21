import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as reportsController from "@/controllers/reports.controller";
const router: IRouter = Router();
router.get("/reports", requireAuth, asyncHandler(reportsController.getReports));
router.post("/reports", requireAuth, asyncHandler(reportsController.postReports));
router.get("/reports/:id/download", requireAuth, asyncHandler(reportsController.getReportsByIdDownload));

export default router;
