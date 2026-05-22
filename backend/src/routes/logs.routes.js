import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "@/middlewares/auth";
import * as logsController from "@/controllers/logs.controller";
const router = Router();
router.get("/logs", requireAuth, asyncHandler(logsController.getLogs));
router.post("/logs", requireAuth, asyncHandler(logsController.postLogs));
router.get("/logs/:id", requireAuth, asyncHandler(logsController.getLogsById));
router.patch("/logs/:id", requireAuth, asyncHandler(logsController.patchLogsById));
var stdin_default = router;
export {
  stdin_default as default
};
