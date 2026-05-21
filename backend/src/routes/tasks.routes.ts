import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as tasksController from "@/controllers/tasks.controller";
const router: IRouter = Router();
router.get("/tasks", requireAuth, asyncHandler(tasksController.getTasks));
router.post("/tasks", requireAuth, requireRole("super_admin"), asyncHandler(tasksController.postTasks));
router.get("/tasks/:id", requireAuth, asyncHandler(tasksController.getTasksById));
router.patch("/tasks/:id", requireAuth, asyncHandler(tasksController.patchTasksById));
router.get("/projects/:id/assignable-members", requireAuth, asyncHandler(tasksController.getProjectsByIdAssignableMembers));

export default router;
