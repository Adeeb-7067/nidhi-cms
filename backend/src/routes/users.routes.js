import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as usersController from "../controllers/users.controller.js";
const router = Router();
router.get("/users", requireAuth, requireRole("super_admin"), asyncHandler(usersController.getUsers));
router.get("/users/preview-employee-id", requireAuth, requireRole("super_admin"), asyncHandler(usersController.getUsersPreviewEmployeeId));
router.post("/users", requireAuth, requireRole("super_admin"), asyncHandler(usersController.postUsers));
router.patch("/users/me/password", requireAuth, asyncHandler(usersController.patchUsersMePassword));
router.get("/users/:id", requireAuth, asyncHandler(usersController.getUsersById));
router.patch("/users/:id", requireAuth, requireRole("super_admin"), asyncHandler(usersController.patchUsersById));
router.delete("/users/:id", requireAuth, requireRole("super_admin"), asyncHandler(usersController.deleteUsersById));
router.patch("/users/:id/password", requireAuth, requireRole("super_admin"), asyncHandler(usersController.patchUsersByIdPassword));
router.get("/users/:id/credentials", requireAuth, requireRole("super_admin"), asyncHandler(usersController.getUsersByIdCredentials));
router.post("/users/:id/credentials/:credId/reveal", requireAuth, requireRole("super_admin"), asyncHandler(usersController.postUsersByIdCredentialsByCredIdReveal));
var stdin_default = router;
export {
  stdin_default as default
};
