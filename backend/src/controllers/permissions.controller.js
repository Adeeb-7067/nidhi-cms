import { HttpError } from "../lib/http-error.js";
import {
  getPermissionsForUser,
  getPermissionCatalog,
  listRoleTemplates,
  updateRoleTemplatePermissions,
} from "../services/permissions.service.js";
import { parseIdParam } from "../utils/route-errors.js";

async function getPermissionsMe(req, res) {
  res.json(await getPermissionsForUser(req.user.id));
}

async function getPermissionCatalogHandler(_req, res) {
  res.json(getPermissionCatalog());
}

async function getRoleTemplates(_req, res) {
  res.json({ templates: await listRoleTemplates() });
}

async function patchRoleTemplatePermissions(req, res) {
  const templateId = parseIdParam(req.params.id, "template id");
  await updateRoleTemplatePermissions(templateId, req.body.permissions ?? []);
  res.json({ message: "Permissions updated" });
}

export {
  getPermissionsMe,
  getPermissionCatalogHandler,
  getRoleTemplates,
  patchRoleTemplatePermissions,
};
