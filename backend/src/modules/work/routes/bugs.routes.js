import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../../../middlewares/auth.js";
import * as bugsController from "../controllers/bugs.controller.js";
const router = Router();
router.get("/bugs", requireAuth, asyncHandler(bugsController.getBugs));
router.post("/bugs/batch", requireAuth, requireRole("developer", "tester", "qa", "freelancer", "super_admin"), asyncHandler(bugsController.postBugsBatch));
router.post("/bugs", requireAuth, requireRole("developer", "tester", "qa", "freelancer", "super_admin"), asyncHandler(bugsController.postBugs));
router.get("/bugs/export", requireAuth, asyncHandler(bugsController.exportBugs));
router.get("/bugs/:id", requireAuth, asyncHandler(bugsController.getBugsById));
router.patch("/bugs/:id", requireAuth, asyncHandler(bugsController.patchBugsById));
router.patch("/bugs/:id/assign", requireAuth, requireRole("tester", "qa", "super_admin"), asyncHandler(bugsController.patchBugsByIdAssign));
router.delete("/bugs/:id/issues/:issueKey", requireAuth, asyncHandler(bugsController.deleteIssueFromBug));
router.delete("/bugs/:id", requireAuth, asyncHandler(bugsController.deleteBugById));
var stdin_default = router;
export {
  stdin_default as default
};
