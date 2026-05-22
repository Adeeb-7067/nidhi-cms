import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as tasksController from "@/controllers/tasks.controller";
const router = Router();
router.get("/tasks", requireAuth, asyncHandler(tasksController.getTasks));
router.post("/tasks", requireAuth, requireRole("super_admin"), asyncHandler(tasksController.postTasks));
router.get("/tasks/:id", requireAuth, asyncHandler(tasksController.getTasksById));
router.patch("/tasks/:id", requireAuth, asyncHandler(tasksController.patchTasksById));
router.get("/projects/:id/assignable-members", requireAuth, asyncHandler(tasksController.getProjectsByIdAssignableMembers));
var stdin_default = router;
export {
  stdin_default as default
};
