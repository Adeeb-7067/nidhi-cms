import {
  getPermissionsForUser,
  getPermissionCatalog,
  listRoleTemplates,
  listAssignableCmsRoles,
  createRoleTemplate,
  updateRoleTemplateMeta,
  updateRoleTemplatePermissions,
  deleteRoleTemplate,
} from "../services/permissions.service.js";
import { parseIdParam, badRequest } from "../utils/route-errors.js";

async function getPermissionsMe(req, res) {
  res.json(await getPermissionsForUser(req.user.id));
}

async function getPermissionCatalogHandler(_req, res) {
  res.json(getPermissionCatalog());
}

async function getRoleTemplates(_req, res) {
  res.json({ templates: await listRoleTemplates() });
}

async function getAssignableCmsRoles(_req, res) {
  res.json({ roles: await listAssignableCmsRoles() });
}

async function postRoleTemplate(req, res) {
  try {
    const created = await createRoleTemplate(req.body ?? {});
    const templates = await listRoleTemplates();
    const template = templates.find((t) => t.id === created.id) ?? created;
    res.status(201).json({ template });
  } catch (err) {
    badRequest(err.message ?? "Failed to create role");
  }
}

async function patchRoleTemplate(req, res) {
  const templateId = parseIdParam(req.params.id, "template id");
  try {
    await updateRoleTemplateMeta(templateId, req.body ?? {});
    const templates = await listRoleTemplates();
    const template = templates.find((t) => t.id === templateId);
    res.json({ template });
  } catch (err) {
    badRequest(err.message ?? "Failed to update role");
  }
}

async function patchRoleTemplatePermissions(req, res) {
  const templateId = parseIdParam(req.params.id, "template id");
  try {
    await updateRoleTemplatePermissions(templateId, req.body.permissions ?? []);
    res.json({ message: "Permissions updated" });
  } catch (err) {
    badRequest(err.message ?? "Failed to update permissions");
  }
}

async function deleteRoleTemplateHandler(req, res) {
  const templateId = parseIdParam(req.params.id, "template id");
  try {
    await deleteRoleTemplate(templateId);
    res.json({ message: "Role deleted" });
  } catch (err) {
    badRequest(err.message ?? "Failed to delete role");
  }
}

export {
  getPermissionsMe,
  getPermissionCatalogHandler,
  getRoleTemplates,
  getAssignableCmsRoles,
  postRoleTemplate,
  patchRoleTemplate,
  patchRoleTemplatePermissions,
  deleteRoleTemplateHandler,
};
