import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as settingsController from "@/controllers/settings.controller";
const router: IRouter = Router();
router.get("/settings", requireAuth, asyncHandler(settingsController.getSettings));
router.patch("/settings", requireAuth, requireRole("super_admin"), asyncHandler(settingsController.patchSettings));

export default router;
