import { getProjectAccess } from "../../access/services/inventory-access.js";
import { forbidden, parseIdParam } from "../../../utils/route-errors.js";

/** Ensures the caller may access project inventory; optionally requires manage rights. */
export async function guardInventoryAccess(req, projectId, needManage = false) {
  const access = await getProjectAccess(req, projectId);
  if (!access.allowed) {
    forbidden("You do not have access to this project inventory.");
  }
  if (needManage && !access.canManage && req.user?.role !== "super_admin") {
    forbidden("Manage permission required for this inventory.");
  }
  return access;
}

export function parseProjectIdParam(req) {
  return parseIdParam(req.params.projectId, "projectId");
}

export function parseInventoryEntityId(req) {
  return parseIdParam(req.params.id, "id");
}
