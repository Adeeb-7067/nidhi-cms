import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as bugsController from "@/controllers/bugs.controller";
const router: IRouter = Router();
router.get("/bugs", requireAuth, asyncHandler(bugsController.getBugs));
router.post("/bugs", requireAuth, requireRole("developer", "tester", "super_admin"), asyncHandler(bugsController.postBugs));
router.get("/bugs/:id", requireAuth, asyncHandler(bugsController.getBugsById));
router.patch("/bugs/:id", requireAuth, asyncHandler(bugsController.patchBugsById));
router.patch("/bugs/:id/assign", requireAuth, requireRole("tester", "super_admin"), asyncHandler(bugsController.patchBugsByIdAssign));

export default router;
