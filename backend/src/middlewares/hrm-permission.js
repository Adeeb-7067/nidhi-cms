import { canAccessHrm } from "../constants/permissions.js";
import { forbidden } from "../utils/route-errors.js";

export { requirePermission, requirePermission as requireHrmPermission } from "./permission.js";

/** Block client accounts from HRM APIs (self-service is staff-only). */
export function requireHrmAccess(req, _res, next) {
  try {
    if (!req.user) {
      next();
      return;
    }
    if (!canAccessHrm(req.user.role)) {
      forbidden("HRM is not available for your account type.");
    }
    next();
  } catch (err) {
    next(err);
  }
}
