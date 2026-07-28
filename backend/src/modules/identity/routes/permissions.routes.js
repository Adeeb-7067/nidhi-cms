import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../../../middlewares/auth.js";
import { requirePermission, requireAnyPermission } from "../../../middlewares/permission.js";
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
router.get(
  "/roles/assignable",
  requireAuth,
  requireAnyPermission(
    ["roles_permissions", "view"],
    ["admin_team", "edit"],
    ["hrm_employees", "edit"],
  ),
  asyncHandler(permissions.getAssignableCmsRoles),
);
router.post(
  "/roles",
  requireAuth,
  requirePermission("roles_permissions", "edit"),
  asyncHandler(permissions.postRoleTemplate),
);
router.patch(
  "/roles/:id",
  requireAuth,
  requirePermission("roles_permissions", "edit"),
  asyncHandler(permissions.patchRoleTemplate),
);
router.patch(
  "/roles/:id/permissions",
  requireAuth,
  requirePermission("roles_permissions", "edit"),
  asyncHandler(permissions.patchRoleTemplatePermissions),
);
router.delete(
  "/roles/:id",
  requireAuth,
  requirePermission("roles_permissions", "edit"),
  asyncHandler(permissions.deleteRoleTemplateHandler),
);

export default router;
