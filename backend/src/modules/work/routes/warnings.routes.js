import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../../../middlewares/auth.js";
import * as warningsController from "../controllers/warnings.controller.js";

const router = Router();
// Only super admins can issue or manage employee warnings.
const admin = [requireAuth, requireRole("super_admin")];

// Employee-facing: active warnings for the current user (any authenticated user).
router.get("/warnings/mine", requireAuth, asyncHandler(warningsController.getMyWarnings));

router.get("/warnings", ...admin, asyncHandler(warningsController.getWarnings));
router.post("/warnings", ...admin, asyncHandler(warningsController.postWarnings));
router.patch("/warnings/:id", ...admin, asyncHandler(warningsController.patchWarningsById));
router.delete("/warnings/:id", ...admin, asyncHandler(warningsController.deleteWarningsById));

export default router;
