import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as projectsController from "../controllers/projects.controller.js";
import { forbidden } from "../utils/route-errors.js";

function requireProjectManageRole(req, res, next) {
  if (req.user?.role === "super_admin" || req.user?.role === "bde" || req.user?.role === "manager") {
    return next();
  }
  if (req.user?.role === "digital") {
    const subType = (req.user?.subType ?? "").toLowerCase().trim();
    if (subType === "account_manager" || subType === "digital_specialist" || !subType) {
      return next();
    }
  }
  return forbidden("Only Account Managers and Admins can perform project management actions.");
}

const router = Router();
router.get("/projects", requireAuth, asyncHandler(projectsController.getProjects));
router.post("/projects", requireAuth, requireProjectManageRole, asyncHandler(projectsController.postProjects));
router.get("/projects/:id", requireAuth, asyncHandler(projectsController.getProjectsById));
router.patch("/projects/:id", requireAuth, requireProjectManageRole, asyncHandler(projectsController.patchProjectsById));
router.delete("/projects/:id", requireAuth, requireProjectManageRole, asyncHandler(projectsController.deleteProjectsById));
router.get("/projects/:id/members", requireAuth, asyncHandler(projectsController.getProjectsByIdMembers));
router.post("/projects/:id/members/batch", requireAuth, requireProjectManageRole, asyncHandler(projectsController.postProjectsByIdMembersBatch));
router.post("/projects/:id/members", requireAuth, requireProjectManageRole, asyncHandler(projectsController.postProjectsByIdMembers));
router.delete("/projects/:id/members/:userId", requireAuth, requireProjectManageRole, asyncHandler(projectsController.deleteProjectsByIdMembersByUserId));

router.get("/projects/:id/apk-schedules", requireAuth, asyncHandler(projectsController.getProjectsByIdApkSchedules));
router.post("/projects/:id/apk-schedules", requireAuth, requireRole("super_admin"), asyncHandler(projectsController.postProjectsByIdApkSchedules));
router.get("/projects/:id/milestones", requireAuth, asyncHandler(projectsController.getProjectsByIdMilestones));
router.post("/projects/:id/milestones", requireAuth, requireRole("super_admin"), asyncHandler(projectsController.postProjectsByIdMilestones));
router.patch("/projects/:id/milestones/:milestoneId", requireAuth, requireRole("super_admin"), asyncHandler(projectsController.patchProjectsByIdMilestonesByMilestoneId));
router.get("/projects/:id/logs", requireAuth, asyncHandler(projectsController.getProjectsByIdLogs));
router.get("/projects/:id/bugs", requireAuth, asyncHandler(projectsController.getProjectsByIdBugs));
router.get("/projects/:id/apk-releases", requireAuth, asyncHandler(projectsController.getProjectsByIdApkReleases));
router.get("/projects/:id/history", requireAuth, asyncHandler(projectsController.getProjectsByIdHistory));
router.get("/projects/:id/client-team", requireAuth, asyncHandler(projectsController.getProjectsByIdClientTeam));
var stdin_default = router;
export {
  stdin_default as default
};
