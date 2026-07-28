import { HttpError } from "../lib/http-error.js";
import { userHasPermission } from "../modules/identity/services/permissions.service.js";
export function requirePermission(module, action) {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Please sign in to continue.", { code: "UNAUTHORIZED" });
      }
      if (req.user.role === "super_admin") {
        next();
        return;
      }
      const allowed = await userHasPermission(req.user.id, module, action);
      if (!allowed) {
        throw new HttpError(403, "You do not have permission for this action.", {
          code: "FORBIDDEN",
          field: module,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Pass if the user has any one of the listed module+action permissions. */
export function requireAnyPermission(...checks) {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Please sign in to continue.", { code: "UNAUTHORIZED" });
      }
      if (req.user.role === "super_admin") {
        next();
        return;
      }
      for (const [module, action] of checks) {
        if (await userHasPermission(req.user.id, module, action)) {
          next();
          return;
        }
      }
      throw new HttpError(403, "You do not have permission for this action.", {
        code: "FORBIDDEN",
      });
    } catch (err) {
      next(err);
    }
  };
}

/** @deprecated Use requirePermission */
export { requirePermission as requireHrmPermission };
