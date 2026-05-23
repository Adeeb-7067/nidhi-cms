import { getCompanyAccess } from "./company-access.js";
import { getProjectAccess } from "./inventory-access.js";
import { HttpError } from "../../lib/http-error.js";
async function assertCompanyAccess(req, companyId, options) {
  const access = await getCompanyAccess(req, companyId);
  const allowSuperAdmin = options?.allowSuperAdmin !== false;
  if (!access.allowed && !(allowSuperAdmin && req.user?.role === "super_admin")) {
    throw new HttpError(
      403,
      "You do not have access to this company. Contact your administrator if you need access.",
      { code: "FORBIDDEN" }
    );
  }
}
async function assertProjectAccess(req, projectId, options) {
  const access = await getProjectAccess(req, projectId);
  if (!access.allowed) {
    throw new HttpError(
      403,
      "You do not have access to this project.",
      { code: "FORBIDDEN" }
    );
  }
  if (options?.needManage && !access.canManage && req.user?.role !== "super_admin") {
    throw new HttpError(
      403,
      "You need manage permission to change this project.",
      { code: "FORBIDDEN" }
    );
  }
  return { isClient: access.isClient, canManage: access.canManage };
}
export {
  assertCompanyAccess,
  assertProjectAccess
};
