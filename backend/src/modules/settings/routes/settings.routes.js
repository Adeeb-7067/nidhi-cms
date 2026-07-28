import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../../../middlewares/auth.js";
import * as settingsController from "../controllers/settings.controller.js";
const router = Router();
router.get("/settings", requireAuth, asyncHandler(settingsController.getSettings));
router.patch("/settings", requireAuth, requireRole("super_admin"), asyncHandler(settingsController.patchSettings));
var stdin_default = router;
export {
  stdin_default as default
};
