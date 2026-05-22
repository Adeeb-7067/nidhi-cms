import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "@/middlewares/auth";
import * as reportsController from "@/controllers/reports.controller";
const router = Router();
router.get("/reports", requireAuth, asyncHandler(reportsController.getReports));
router.post("/reports", requireAuth, asyncHandler(reportsController.postReports));
router.get("/reports/:id/download", requireAuth, asyncHandler(reportsController.getReportsByIdDownload));
var stdin_default = router;
export {
  stdin_default as default
};
