import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";
import * as permissions from "../controllers/permissions.controller.js";

const router = Router();

router.get("/permissions/me", requireAuth, asyncHandler(permissions.getPermissionsMe));
router.get("/permissions/catalog", requireAuth, asyncHandler(permissions.getPermissionCatalogHandler));

/** @deprecated use /permissions/me */
router.get("/hrm/permissions/me", requireAuth, asyncHandler(permissions.getPermissionsMe));
router.get("/hrm/permissions/catalog", requireAuth, asyncHandler(permissions.getPermissionCatalogHandler));
/** @deprecated use /roles */
router.get("/hrm/roles", requireAuth, requirePermission("roles_permissions", "view"), asyncHandler(permissions.getRoleTemplates));
router.patch("/hrm/roles/:id/permissions", requireAuth, requirePermission("roles_permissions", "edit"), asyncHandler(permissions.patchRoleTemplatePermissions));

router.get(
  "/roles",
  requireAuth,
  requirePermission("roles_permissions", "view"),
  asyncHandler(permissions.getRoleTemplates),
);
router.patch(
  "/roles/:id/permissions",
  requireAuth,
  requirePermission("roles_permissions", "edit"),
  asyncHandler(permissions.patchRoleTemplatePermissions),
);

export default router;
