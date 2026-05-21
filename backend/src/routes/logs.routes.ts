import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as logsController from "@/controllers/logs.controller";
const router: IRouter = Router();
router.get("/logs", requireAuth, asyncHandler(logsController.getLogs));
router.post("/logs", requireAuth, asyncHandler(logsController.postLogs));
router.get("/logs/:id", requireAuth, asyncHandler(logsController.getLogsById));
router.patch("/logs/:id", requireAuth, asyncHandler(logsController.patchLogsById));

export default router;
